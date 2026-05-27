"""Simulation pipeline orchestrator.

Stages:
  1. ontology_gen  — build the founder DNA ontology from scenario + archetype
  2. dna_synthesis — synthesise agent personas from ontology
  3. cascade_step  — iterative consequence expansion (3 steps)
  4. consequence_scoring — score each node in the tree
  5. narrative_gen — write final narrative summary

Each stage calls llm_gateway.complete_json() with the appropriate Stage enum value.
Progress is pushed to an in-process SSE queue keyed by simulation_id.
"""
from __future__ import annotations

import json
import logging
import traceback
from dataclasses import dataclass, field
from typing import Any

from llm_gateway import Stage, complete_json
from llm_gateway.errors import AllProvidersFailed, SpendCapExceeded

from .consequence_tree import ConsequenceTree, build_consequence_tree
from .errors import SimulationCancelled
from .progress import push_done, push_error, push_event

logger = logging.getLogger(__name__)

# ── Base-rate calibration data for improving simulation fidelity ──────────────

ARCHETYPE_CALIBRATION: dict[str, dict[str, Any]] = {
    "visionary": {
        "bias": "tends to underestimate time-to-revenue by 40-60%, overestimate TAM by 2-3x",
        "strength": "exceptional at recruiting and vision-setting",
        "historical_pmf_rate": 0.22,  # % who find PMF within 24 months
        "known_failure_modes": [
            "premature scaling before PMF (occurs in 58% of cases)",
            "product over-engineering relative to customer needs",
            "underweighting sales motion complexity",
        ],
    },
    "operator": {
        "bias": "underestimates market risk, overestimates execution speed once plan is set",
        "strength": "strong at process and scaling once PMF achieved",
        "historical_pmf_rate": 0.31,
        "known_failure_modes": [
            "plan rigidity when market signals diverge from assumptions",
            "under-investing in product discovery relative to execution",
            "slower to pivot than market requires (avg 6-month lag)",
        ],
    },
    "pragmatist": {
        "bias": "tends to under-invest in growth relative to optimum, exits too early",
        "strength": "cash-efficient, avoids fatal mistakes",
        "historical_pmf_rate": 0.38,
        "known_failure_modes": [
            "cedes market position to better-funded competitors willing to lose money",
            "underbuilds team, creating single points of failure",
            "optimises for survival over value creation",
        ],
    },
    "contrarian": {
        "bias": "dismisses conventional wisdom, sometimes correctly, often at high cost",
        "strength": "identifies non-consensus opportunities others miss",
        "historical_pmf_rate": 0.19,
        "known_failure_modes": [
            "market timing errors (2-3 years too early in 44% of cases)",
            "investor alignment failures due to unconventional approach",
            "team cohesion issues when vision is difficult to communicate",
        ],
    },
    "analyst": {
        "bias": "analysis paralysis, over-indexes on data at expense of velocity",
        "strength": "strong at unit economics and risk identification",
        "historical_pmf_rate": 0.28,
        "known_failure_modes": [
            "shipping 40-60% slower than market-responsive competitors",
            "over-reliance on quantitative signals, under-weighting qualitative customer insight",
            "hiring over-qualified generalists instead of scrappy specialists",
        ],
    },
}

SCENARIO_BASE_RATES: dict[str, dict[str, Any]] = {
    "seed-round-sizing": {
        "reference": "YC W21-S23 batch: median time to Series A = 22 months; 28% of companies that raised <$1.5M seed never raised follow-on",
        "survival_18m": 0.71,
        "key_variable": "runway duration",
        "calibration_note": "Each additional 3 months of runway beyond 18 months increases Series A conversion by ~8 percentage points",
    },
    "hiring-plan-ab": {
        "reference": "Startup hiring studies show first engineering hire within 3 months of seed reduces time-to-MVP by 34%",
        "survival_18m": 0.68,
        "key_variable": "hire timing and role specificity",
        "calibration_note": "Mis-hires at seed stage cost avg 6 months and $120K in direct costs; generalist hires at Series A have 2.3x higher retention than seed-stage generalists",
    },
    "pivot-timing": {
        "reference": "CB Insights: 42% of startups that ran out of funding hadn't pivoted soon enough; successful pivots happen avg 14 months post-founding",
        "survival_18m": 0.55,
        "key_variable": "months of runway remaining at pivot decision",
        "calibration_note": "Pivots with >9 months runway succeed 61% of the time; pivots with <4 months runway succeed 22% of the time",
    },
    "gtm-sensitivity": {
        "reference": "OpenView Partners: PLG companies reach $1M ARR in avg 24 months vs 36 months for sales-led at equivalent seed size",
        "survival_18m": 0.65,
        "key_variable": "GTM motion (PLG vs sales-led vs hybrid)",
        "calibration_note": "Sales-led GTM with <3 enterprise reps has 73% miss rate on $1M ARR in 18 months; PLG with weak activation (<30% D7 retention) performs no better than sales-led",
    },
    "bridge-round": {
        "reference": "NVCA data: 67% of bridge rounds that extended runway >12 months led to successful next round; <6 months runway extension leads to next round only 31% of the time",
        "survival_18m": 0.58,
        "key_variable": "bridge size relative to monthly burn",
        "calibration_note": "Bridges taken at >18 months post-last-round signal to investors the company missed plan; bridges at 12-15 months are viewed as strategic rather than distressed",
    },
    "vp-hire-timing": {
        "reference": "First Round Capital: 75% of VP Sales hired pre-$1M ARR are replaced within 18 months",
        "survival_18m": 0.72,
        "key_variable": "ARR at time of VP hire",
        "calibration_note": "Hiring VP Sales before repeatable sales motion is proven adds $180-250K burn with negative expected value in 68% of cases; right timing is first 3 closed deals with ACV > $15K",
    },
    "pricing-strategy": {
        "reference": "Price Intelligently: SaaS companies that raise prices annually churn 25% less than those that don't; value-based pricing increases ACV 2-3x vs cost-plus",
        "survival_18m": 0.74,
        "key_variable": "pricing model and initial price point",
        "calibration_note": "Underpricing at launch is 4x more common than overpricing among seed-stage B2B SaaS; initial price anchors future enterprise negotiations — discounting >30% from list in year 1 correlates with 40% higher churn",
    },
}


@dataclass
class SimulationRequest:
    simulation_id: str
    user_id: str | None
    user_tier: str
    scenario_id: str
    archetype: str
    decision_option_id: str
    parameters: dict[str, Any]
    seed: str
    model_tier_override: str | None = None
    cancel_flag: Any = field(default=None, repr=False)  # threading.Event | None


def _is_cancelled(req: SimulationRequest) -> bool:
    """Return True if a cancellation event has been set for this simulation."""
    return req.cancel_flag is not None and req.cancel_flag.is_set()


def run_pipeline(req: SimulationRequest) -> dict[str, Any]:
    """Run the full simulation pipeline. Designed to run in a background thread.

    Pushes SSE progress events throughout. Returns the full results dict on success.
    Pushes an error event and re-raises on failure.
    """
    # Inline import to avoid circular dependency (api.internal → pipeline → api.internal)
    from api.internal import store_result  # noqa: PLC0415

    sim_id = req.simulation_id
    try:
        push_event(sim_id, "started", {"stage": "ontology_gen", "pct": 0})

        # ── Stage 1: Ontology generation ──────────────────────────────────
        if _is_cancelled(req):
            raise SimulationCancelled(sim_id)
        ontology_prompt = _build_ontology_prompt(req)
        ontology = complete_json(
            stage=Stage.ONTOLOGY_GEN,
            messages=[{"role": "user", "content": ontology_prompt}],
            user_id=req.user_id,
            user_tier=req.user_tier,
            simulation_id=sim_id,
        )
        push_event(
            sim_id,
            "progress",
            {"stage": "ontology_gen", "pct": 15, "data": {"ontology_keys": list(ontology.keys())}},
        )

        # ── Stage 2: DNA synthesis (agent personas) ───────────────────────
        if _is_cancelled(req):
            raise SimulationCancelled(sim_id)
        dna_prompt = _build_dna_prompt(req, ontology)
        dna = complete_json(
            stage=Stage.DNA_SYNTHESIS,
            messages=[{"role": "user", "content": dna_prompt}],
            user_id=req.user_id,
            user_tier=req.user_tier,
            simulation_id=sim_id,
        )
        push_event(
            sim_id,
            "progress",
            {"stage": "dna_synthesis", "pct": 30, "data": {"agent_count": len(dna.get("agents", []))}},
        )

        # ── Stage 3: Cascade steps (consequence expansion — 3 iterations) ─
        cascade_history: list[dict[str, Any]] = []
        for step in range(3):
            if _is_cancelled(req):
                raise SimulationCancelled(sim_id)
            cascade_prompt = _build_cascade_prompt(req, ontology, dna, cascade_history, step)
            cascade_result = complete_json(
                stage=Stage.CASCADE_STEP,
                messages=[{"role": "user", "content": cascade_prompt}],
                user_id=req.user_id,
                user_tier=req.user_tier,
                simulation_id=sim_id,
            )
            cascade_history.append(cascade_result)
            pct = 30 + (step + 1) * 15  # 45, 60, 75
            push_event(sim_id, "progress", {"stage": "cascade_step", "pct": pct, "step": step + 1})

        # ── Stage 4: Consequence scoring ──────────────────────────────────
        if _is_cancelled(req):
            raise SimulationCancelled(sim_id)
        scoring_prompt = _build_scoring_prompt(req, ontology, cascade_history)
        scored = complete_json(
            stage=Stage.CONSEQUENCE_SCORING,
            messages=[{"role": "user", "content": scoring_prompt}],
            user_id=req.user_id,
            user_tier=req.user_tier,
            simulation_id=sim_id,
        )
        push_event(sim_id, "progress", {"stage": "consequence_scoring", "pct": 85})

        # ── Stage 5: Narrative generation ─────────────────────────────────
        if _is_cancelled(req):
            raise SimulationCancelled(sim_id)
        narrative_prompt = _build_narrative_prompt(req, ontology, cascade_history, scored)
        narrative = complete_json(
            stage=Stage.NARRATIVE_GEN,
            messages=[{"role": "user", "content": narrative_prompt}],
            user_id=req.user_id,
            user_tier=req.user_tier,
            simulation_id=sim_id,
        )
        push_event(sim_id, "progress", {"stage": "narrative_gen", "pct": 95})

        # ── Build consequence tree ─────────────────────────────────────────
        tree: ConsequenceTree = build_consequence_tree(cascade_history, scored)

        results: dict[str, Any] = {
            "simulation_id": sim_id,
            "scenario_id": req.scenario_id,
            "archetype": req.archetype,
            "decision_option_id": req.decision_option_id,
            "ontology": ontology,
            "agents": dna.get("agents", []),
            "consequence_tree": tree.to_dict(),
            "narrative": narrative.get("summary", ""),
            "key_risks": narrative.get("key_risks", []),
            "upside_scenarios": narrative.get("upside_scenarios", []),
            "confidence_score": scored.get("overall_confidence", 0.5),
            "timeline_months": narrative.get("timeline_months", 12),
        }

        from simulation.probability_calibrator import calibrate_simulation_result  # noqa: PLC0415

        results = calibrate_simulation_result(results)
        store_result(sim_id, results)
        push_done(sim_id, results)
        return results

    except SimulationCancelled:
        push_error(sim_id, "cancelled", f"Simulation {sim_id} was cancelled")
        raise
    except SpendCapExceeded as exc:
        push_error(sim_id, "spend_cap_exceeded", str(exc))
        raise
    except AllProvidersFailed as exc:
        push_error(sim_id, "llm_unavailable", str(exc))
        raise
    except Exception as exc:
        logger.exception("Pipeline failed for sim %s", sim_id)
        push_error(sim_id, "internal_error", traceback.format_exc(limit=3))
        raise


# ── Prompt builders ────────────────────────────────────────────────────────────


def _build_ontology_prompt(req: SimulationRequest) -> str:
    archetype_data = ARCHETYPE_CALIBRATION.get(req.archetype, {})
    scenario_data = SCENARIO_BASE_RATES.get(req.scenario_id, {})

    calibration_context = {
        "archetype_profile": archetype_data,
        "scenario_base_rates": scenario_data,
    }

    return json.dumps({
        "task": "ontology_generation",
        "scenario_id": req.scenario_id,
        "archetype": req.archetype,
        "decision": req.decision_option_id,
        "parameters": req.parameters,
        "calibration_context": calibration_context,
        "instruction": (
            "You are a senior startup ecosystem analyst with deep knowledge of venture-backed company outcomes. "
            "Given the founder archetype, scenario, decision, and calibration context, generate a structured ontology. "
            "\n\nCRITICAL: You must use the archetype_profile.bias and archetype_profile.known_failure_modes "
            "to ground your psychology_risks in evidence. Reference the scenario_base_rates.reference data "
            "explicitly when identifying resource constraints. "
            "\n\nFor a " + req.archetype + " founder choosing '" + req.decision_option_id + "' in the "
            + req.scenario_id + " scenario, the archetype's historical PMF rate is "
            + str(archetype_data.get("historical_pmf_rate", "unknown"))
            + " (within 24 months). Adjust your risk factors accordingly. "
            "\n\nGenerate a structured ontology of: "
            "(1) key stakeholders (investors, customers, employees, competitors) with specific influence weights, "
            "(2) resource constraints (cash, time, talent) with quantitative bounds where possible, "
            "(3) market dynamics including competitive response probabilities, "
            "(4) founder psychology risk factors grounded in the known failure modes for this archetype. "
            "\n\nReturn valid JSON with keys: stakeholders, constraints, market_dynamics, psychology_risks. "
            "Each psychology_risk must include a 'base_rate' field (0-1) reflecting how often this archetype "
            "exhibits this risk in similar scenarios."
        ),
    })


def _build_dna_prompt(req: SimulationRequest, ontology: dict[str, Any]) -> str:
    return json.dumps({
        "task": "agent_dna_synthesis",
        "ontology": ontology,
        "archetype": req.archetype,
        "instruction": (
            "Synthesise 3–5 agent personas who will interact in this simulation. "
            "Each agent has: id, role, goals (list), biases (list), decision_style. "
            "Return JSON with key 'agents': list of agent objects."
        ),
    })


def _build_cascade_prompt(
    req: SimulationRequest,
    ontology: dict[str, Any],
    dna: dict[str, Any],
    history: list[dict[str, Any]],
    step: int,
) -> str:
    archetype_data = ARCHETYPE_CALIBRATION.get(req.archetype, {})
    scenario_data = SCENARIO_BASE_RATES.get(req.scenario_id, {})
    survival_18m = scenario_data.get("survival_18m", 0.65)

    # Compute the parent probability ceiling from previous step nodes
    parent_prob_context = ""
    if history:
        prev_nodes = history[-1].get("nodes", [])
        if prev_nodes:
            probs = [n.get("probability", 0.5) for n in prev_nodes]
            avg_prob = sum(probs) / len(probs) if probs else 0.5
            parent_prob_context = (
                f"The previous step produced nodes with average probability {avg_prob:.2f}. "
                f"Your child node probabilities must be anchored to these parent values — "
                f"a child node cannot have higher probability than its parent unless it is explicitly "
                f"a recovery path (set is_recovery_path=true in that case)."
            )

    step_time_horizons = {0: "0-6 months", 1: "6-12 months", 2: "12-18 months"}
    time_horizon = step_time_horizons.get(step, "12-18 months")

    return json.dumps({
        "task": "cascade_step",
        "step": step + 1,
        "time_horizon": time_horizon,
        "scenario_id": req.scenario_id,
        "archetype": req.archetype,
        "decision": req.decision_option_id,
        "parameters": req.parameters,
        "ontology": ontology,
        "agents": dna.get("agents", []),
        "previous_steps": history,
        "calibration": {
            "archetype_bias": archetype_data.get("bias", ""),
            "scenario_survival_18m": survival_18m,
            "scenario_key_variable": scenario_data.get("key_variable", ""),
            "calibration_note": scenario_data.get("calibration_note", ""),
        },
        "instruction": (
            f"You are a calibrated probability estimator with expertise in venture-backed startup outcomes. "
            f"This is cascade step {step + 1} of 3, covering the {time_horizon} time horizon. "
            "\n\nPROBABILITY CALIBRATION RULES (strictly enforced):"
            "\n1. All probabilities must be internally consistent. If a parent node has P=0.45, "
            "child nodes must have P ≤ 0.45 unless the child is a recovery scenario (set is_recovery_path=true)."
            "\n2. Probabilities must be anchored to base rates: B2B SaaS companies that fail to reach "
            "$1M ARR in 24 months do so primarily due to sales motion mismatch (42%), premature scaling (31%), "
            "or founder conflict (18%). Use these as prior distributions."
            f"\n3. The base survival rate for this scenario type at 18 months is {survival_18m:.0%}. "
            "Your root-level node probabilities must be consistent with this prior."
            f"\n4. {parent_prob_context}"
            "\n5. No probability should be exactly 0.0 or 1.0. Clip to [0.01, 0.99]."
            "\n6. Sibling nodes (same parent) must have probabilities that sum to ≤ 1.0."
            f"\n\nARCHETYPE ADJUSTMENT: This is a {req.archetype} founder. "
            f"Known bias: {archetype_data.get('bias', 'n/a')}. "
            "Adjust outcome probabilities to reflect this bias — e.g., a visionary founder's "
            "revenue forecasts should be discounted 40-60% from stated targets."
            "\n\nSimulate how the agents react to the decision and its prior consequences "
            f"specifically for the {time_horizon} window. Include specific, quantified reactions "
            "where possible (e.g., 'investor confidence drops 25% if burn exceeds $150K/month')."
            "\n\nReturn JSON: { "
            "nodes: [{id, label, type, probability, impact_score, parent_id, is_recovery_path, narrative}], "
            "agent_reactions: [{agent_id, reaction, emotional_state, probability_adjustment}] "
            "}"
        ),
    })


def _build_scoring_prompt(
    req: SimulationRequest,
    ontology: dict[str, Any],
    cascade_history: list[dict[str, Any]],
) -> str:
    all_nodes: list[dict[str, Any]] = []
    for step in cascade_history:
        all_nodes.extend(step.get("nodes", []))

    archetype_data = ARCHETYPE_CALIBRATION.get(req.archetype, {})
    scenario_data = SCENARIO_BASE_RATES.get(req.scenario_id, {})

    return json.dumps({
        "task": "consequence_scoring",
        "scenario_id": req.scenario_id,
        "archetype": req.archetype,
        "decision": req.decision_option_id,
        "parameters": req.parameters,
        "nodes": all_nodes,
        "calibration": {
            "archetype_strength": archetype_data.get("strength", ""),
            "archetype_bias": archetype_data.get("bias", ""),
            "scenario_reference": scenario_data.get("reference", ""),
            "scenario_calibration_note": scenario_data.get("calibration_note", ""),
        },
        "instruction": (
            "You are a calibrated consequence scoring engine. Score the full consequence tree "
            "with UNCERTAINTY BANDS, not just point estimates. "
            "\n\nFor each node, assign:"
            "\n- severity (0–1): how bad/good is the outcome if it occurs"
            "\n- likelihood (0–1): probability of occurrence given parent event"
            "\n- reversibility (0–1, 1=easily reversible): can this be undone"
            "\n- score (0–1): composite consequence score"
            "\n- confidence (0–1): how certain are you about this score (1=very certain, 0=highly uncertain)"
            "\n- lower_bound (0–1): pessimistic estimate of score at 10th percentile"
            "\n- upper_bound (0–1): optimistic estimate of score at 90th percentile"
            "\n\nUNCERTAINTY CALIBRATION RULES:"
            "\n1. Nodes in the first cascade step (shorter time horizon) should have narrower bands "
            "(upper_bound - lower_bound ≤ 0.2) than later steps (≤ 0.4)."
            "\n2. Recovery path nodes should have wider uncertainty bands due to higher variance outcomes."
            "\n3. The overall_confidence should reflect the proportion of nodes where you have "
            "high confidence (confidence > 0.7). A simulation with many uncertain nodes should "
            "have overall_confidence < 0.6."
            f"\n4. For a {req.archetype} founder, adjust confidence downward by 0.1 for any node "
            f"involving {archetype_data.get('bias', 'the known failure modes').split(',')[0]}."
            "\n\nAlso compute overall_confidence (0–1) as a weighted average of node confidences. "
            "\n\nReturn JSON: { "
            "scored_nodes: [{id, severity, likelihood, reversibility, score, confidence, lower_bound, upper_bound}], "
            "overall_confidence: float "
            "}"
        ),
    })


def _build_narrative_prompt(
    req: SimulationRequest,
    ontology: dict[str, Any],
    cascade_history: list[dict[str, Any]],
    scored: dict[str, Any],
) -> str:
    archetype_data = ARCHETYPE_CALIBRATION.get(req.archetype, {})
    scenario_data = SCENARIO_BASE_RATES.get(req.scenario_id, {})

    # Collect specific parameter values to force narrative specificity
    params_str = ", ".join(
        f"{k}={v}" for k, v in (req.parameters or {}).items()
    ) or "default parameters"

    return json.dumps({
        "task": "narrative_generation",
        "scenario_id": req.scenario_id,
        "archetype": req.archetype,
        "decision": req.decision_option_id,
        "parameters": req.parameters,
        "scored_nodes": scored.get("scored_nodes", []),
        "calibration": {
            "archetype_strength": archetype_data.get("strength", ""),
            "archetype_bias": archetype_data.get("bias", ""),
            "scenario_reference": scenario_data.get("reference", ""),
            "survival_18m": scenario_data.get("survival_18m", 0.65),
        },
        "instruction": (
            "Write an insight-dense, founder-facing narrative for this simulation. "
            "\n\nCRITICAL SPECIFICITY RULES — violating these makes the narrative unacceptable:"
            f"\n1. You MUST reference the SPECIFIC parameter values the user set: [{params_str}]. "
            "If the user set fundraising to $1.2M at 20% dilution, write '$1.2M at 20% dilution' — not 'your fundraise'."
            "\n2. Generic narratives that could apply to any simulation are UNACCEPTABLE. "
            "Every sentence must be specific to this founder's archetype, decision, and parameter values."
            "\n3. Every key_risk bullet must contain at least one specific, actionable insight "
            "(e.g., 'Your burn rate of $X/month gives you Y months to hit Z milestone — if you miss, "
            "bridge terms will likely require >15% dilution based on comparable rounds')."
            "\n4. Every upside_scenario must reference a specific mechanism, not a vague outcome "
            "(e.g., 'If PLG activation hits 35%+ D7 retention, word-of-mouth compounds to cut CAC by 40%')."
            f"\n5. Acknowledge the {req.archetype} archetype's known bias ({archetype_data.get('bias', 'n/a')}) "
            "and how it affects interpretation of this simulation's results."
            f"\n6. Ground the timeline in the scenario base rate: {scenario_data.get('reference', 'see calibration data')}."
            "\n\nWrite in second person ('you'), plain English, assuming a technically sophisticated founder. "
            "No hedging language like 'might' or 'could' — use probability estimates instead ('67% chance of...')."
            "\n\nReturn JSON: { "
            "summary: str (3-5 sentences, highly specific to this simulation), "
            "key_risks: [str] (3-5 specific actionable bullets with numbers), "
            "upside_scenarios: [str] (2-3 specific mechanistic bullets), "
            "timeline_months: int (12 or 24 or 36) "
            "}"
        ),
    })
