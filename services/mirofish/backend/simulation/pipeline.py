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
    return json.dumps({
        "task": "ontology_generation",
        "scenario_id": req.scenario_id,
        "archetype": req.archetype,
        "decision": req.decision_option_id,
        "parameters": req.parameters,
        "instruction": (
            "You are a startup ecosystem analyst. Given the founder archetype, scenario, "
            "and chosen decision, generate a structured ontology of: "
            "(1) key stakeholders (investors, customers, employees, competitors), "
            "(2) resource constraints (cash, time, talent), "
            "(3) market dynamics, "
            "(4) founder psychology risk factors. "
            "Return valid JSON with keys: stakeholders, constraints, market_dynamics, psychology_risks."
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
    return json.dumps({
        "task": "cascade_step",
        "step": step + 1,
        "scenario_id": req.scenario_id,
        "decision": req.decision_option_id,
        "ontology": ontology,
        "agents": dna.get("agents", []),
        "previous_steps": history,
        "instruction": (
            f"This is cascade step {step + 1} of 3. "
            "Simulate how the agents react to the decision and its prior consequences. "
            "Return JSON: { nodes: [{id, label, type, probability, impact_score, parent_id}], "
            "agent_reactions: [{agent_id, reaction, emotional_state}] }"
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
    return json.dumps({
        "task": "consequence_scoring",
        "scenario_id": req.scenario_id,
        "archetype": req.archetype,
        "nodes": all_nodes,
        "instruction": (
            "Score the full consequence tree. For each node, assign: severity (0–1), likelihood (0–1), "
            "reversibility (0–1, 1=easily reversible). Also compute overall_confidence (0–1) for the simulation. "
            "Return JSON: { scored_nodes: [...], overall_confidence: float }"
        ),
    })


def _build_narrative_prompt(
    req: SimulationRequest,
    ontology: dict[str, Any],
    cascade_history: list[dict[str, Any]],
    scored: dict[str, Any],
) -> str:
    return json.dumps({
        "task": "narrative_generation",
        "scenario_id": req.scenario_id,
        "archetype": req.archetype,
        "decision": req.decision_option_id,
        "scored_nodes": scored.get("scored_nodes", []),
        "instruction": (
            "Write a founder-facing narrative for this simulation. "
            "Return JSON: { "
            "summary: str (3–5 sentences, plain English, second person 'you'), "
            "key_risks: [str] (3–5 bullets), "
            "upside_scenarios: [str] (2–3 bullets), "
            "timeline_months: int (12 or 24 or 36) "
            "}"
        ),
    })
