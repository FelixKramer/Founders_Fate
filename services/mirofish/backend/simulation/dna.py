"""Decision DNA report generator.

Analyses a user's simulation history to identify:
1. Cognitive biases (recency bias, overconfidence, loss aversion, etc.)
2. Decision patterns (risk appetite, speed vs. thoroughness, etc.)
3. Archetype consistency (do choices match their stated archetype?)
4. Blind spots + recommendations

Uses Stage.DNA_SYNTHESIS via the LLM gateway.
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

from llm_gateway import Stage, complete_json

logger = logging.getLogger(__name__)

REPORTS_DIR = Path(os.environ.get("REPORTS_DIR", "/data/uploads/reports/dna"))


def generate_dna_report(
    user_id: str,
    simulation_summaries: list[dict[str, Any]],
    job_id: str,
    jobs_registry: dict,
) -> None:
    """Run in a background thread. Updates jobs_registry[job_id] in place."""
    jobs_registry[job_id] = {"status": "running", "result": None, "error": None}

    try:
        # Stage 1: bias analysis
        bias_prompt = _build_bias_prompt(user_id, simulation_summaries)
        biases = complete_json(
            stage=Stage.DNA_SYNTHESIS,
            messages=[{"role": "user", "content": bias_prompt}],
            user_id=user_id,
            user_tier="pro",  # DNA is a pro feature but system job — use pro tier
            simulation_id=job_id,
        )

        # Stage 2: pattern synthesis
        pattern_prompt = _build_pattern_prompt(user_id, simulation_summaries, biases)
        patterns = complete_json(
            stage=Stage.DNA_SYNTHESIS,
            messages=[{"role": "user", "content": pattern_prompt}],
            user_id=user_id,
            user_tier="pro",
            simulation_id=job_id,
        )

        result = {
            "job_id": job_id,
            "user_id": user_id,
            "generated_at": time.time(),
            "simulation_count": len(simulation_summaries),
            "cognitive_biases": biases.get("biases", []),
            "decision_patterns": patterns.get("patterns", []),
            "archetype_consistency": patterns.get("archetype_consistency", 0.5),
            "blind_spots": patterns.get("blind_spots", []),
            "recommendations": patterns.get("recommendations", []),
            "contradiction_narrative": patterns.get("contradiction_narrative", ""),
            "overall_summary": patterns.get("overall_summary", ""),
            "risk_profile": biases.get("risk_profile", "balanced"),
        }

        # Persist to disk
        _save_report(user_id, result)

        jobs_registry[job_id] = {"status": "completed", "result": result, "error": None}
        logger.info("DNA report complete: user=%s job=%s", user_id, job_id)

    except Exception as exc:
        logger.exception("DNA report failed: user=%s job=%s", user_id, job_id)
        jobs_registry[job_id] = {"status": "failed", "result": None, "error": str(exc)}


def _build_bias_prompt(user_id: str, summaries: list[dict]) -> str:
    return json.dumps({
        "task": "cognitive_bias_analysis",
        "simulation_count": len(summaries),
        "simulations": summaries,
        "instruction": (
            "Analyse this founder's simulation history for cognitive biases. "
            "Look for patterns like: overconfidence (consistently high-risk choices), "
            "loss aversion (always choosing conservative options), recency bias, "
            "sunk cost fallacy indicators, and confirmation bias. "
            "Also assess their risk profile (aggressive/balanced/conservative). "
            "Return JSON: { "
            "biases: [{name: str, description: str, evidence: str, severity: 'low'|'medium'|'high'}], "
            "risk_profile: 'aggressive'|'balanced'|'conservative' "
            "}"
        ),
    })


def _build_pattern_prompt(user_id: str, summaries: list[dict], biases: dict) -> str:
    return json.dumps({
        "task": "decision_pattern_synthesis",
        "simulations": summaries,
        "identified_biases": biases.get("biases", []),
        "instruction": (
            "Based on this founder's simulation history and identified biases, synthesise their "
            "Decision DNA: their unique decision-making fingerprint. "
            "Identify: "
            "1. Core decision patterns (how they approach tradeoffs, speed vs. analysis, etc.) "
            "2. Archetype consistency (0.0=inconsistent with stated archetype, 1.0=perfectly consistent) "
            "3. Blind spots (what risks they systematically underestimate) "
            "4. 3-5 actionable recommendations to improve decision quality "
            "5. Any contradictions between stated archetype and actual choices "
            "6. Overall summary (3-4 sentences, second person 'you') "
            "Return JSON: { "
            "patterns: [{name: str, description: str, frequency: 'rare'|'occasional'|'consistent'}], "
            "archetype_consistency: float, "
            "blind_spots: [str], "
            "recommendations: [{title: str, description: str, priority: 'high'|'medium'|'low'}], "
            "contradiction_narrative: str, "
            "overall_summary: str "
            "}"
        ),
    })


def _save_report(user_id: str, report: dict) -> None:
    """Persist report JSON to disk."""
    try:
        user_dir = REPORTS_DIR / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        report_path = user_dir / "report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
    except Exception as exc:
        logger.warning("Failed to save DNA report to disk: %s", exc)


def load_report(user_id: str) -> dict | None:
    """Load the most recent DNA report for a user."""
    try:
        report_path = REPORTS_DIR / user_id / "report.json"
        if report_path.exists():
            with open(report_path) as f:
                return json.load(f)
    except Exception as exc:
        logger.debug("Failed to load DNA report: %s", exc)
    return None
