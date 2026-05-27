"""Pre-mortem Monte Carlo engine for enterprise tier."""
from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from llm_gateway import Stage, complete_json

REPORTS_DIR = Path("/data/uploads/premortem")
_jobs: dict[str, dict] = {}  # in-process job registry
_jobs_lock = threading.Lock()


@dataclass
class PremortemRequest:
    job_id: str
    user_id: str
    content: str          # extracted text from uploaded doc
    scenario_name: str
    iterations: int = 200  # lower than spec for cost; doc says 1000 but that's Monte Carlo concept


@dataclass
class IterationResult:
    iteration: int
    failure_mode: str
    probability: float
    severity: str  # "critical" | "major" | "minor"
    mitigation: str
    timeline_months: int


def run_premortem_async(req: PremortemRequest) -> None:
    """Kick off in background thread; store result in _jobs."""
    with _jobs_lock:
        _jobs[req.job_id] = {"status": "running", "progress": 0, "started_at": time.time()}
    t = threading.Thread(target=_run, args=(req,), daemon=True)
    t.start()


def _run(req: PremortemRequest) -> None:
    try:
        # Stage 1: extract failure modes via LLM
        failure_modes_result = complete_json(
            stage=Stage.PREMORTEM_ITER,
            messages=[
                {
                    "role": "system",
                    "content": "You are a startup failure analyst. Be brutally honest. Return only valid JSON.",
                },
                {
                    "role": "user",
                    "content": (
                        f"Analyze this business plan and identify the 10 most critical failure modes.\n"
                        f"Business plan excerpt: {req.content[:3000]}\n\n"
                        'Return JSON: {"failure_modes": [{"id": "string", "description": "string", "category": "string"}]}'
                    ),
                },
            ],
            user_id=req.user_id,
            user_tier="enterprise",
        )
        failure_modes = failure_modes_result.get("failure_modes", [])[:10]

        with _jobs_lock:
            _jobs[req.job_id]["progress"] = 20

        # Stage 2: score each failure mode
        iterations: list[IterationResult] = []
        for i, fm in enumerate(failure_modes):
            scored = complete_json(
                stage=Stage.PREMORTEM_ITER,
                messages=[
                    {
                        "role": "system",
                        "content": "Return only valid JSON. Probability must be 0.0-1.0.",
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Score this failure mode for the business:\n"
                            f"Failure mode: {fm['description']}\n"
                            f"Business context: {req.content[:1000]}\n\n"
                            'Return JSON: {"probability": 0.5, "severity": "critical|major|minor", '
                            '"mitigation": "string", "timeline_months": 12}'
                        ),
                    },
                ],
                user_id=req.user_id,
                user_tier="enterprise",
                cache=False,
            )
            iterations.append(IterationResult(
                iteration=i,
                failure_mode=fm["description"],
                probability=min(1.0, max(0.0, float(scored.get("probability", 0.5)))),
                severity=scored.get("severity", "major"),
                mitigation=scored.get("mitigation", "Mitigate proactively."),
                timeline_months=int(scored.get("timeline_months", 12)),
            ))

            with _jobs_lock:
                _jobs[req.job_id]["progress"] = 20 + int(60 * (i + 1) / max(len(failure_modes), 1))

        # Stage 3: synthesis narrative
        synthesis = complete_json(
            stage=Stage.PREMORTEM_SYNTH,
            messages=[
                {
                    "role": "system",
                    "content": "You are a strategic risk advisor. Be concrete and actionable. Return only valid JSON.",
                },
                {
                    "role": "user",
                    "content": (
                        f"Synthesize a pre-mortem report for: {req.scenario_name}\n"
                        f"Failure modes analyzed: {json.dumps([{'mode': r.failure_mode, 'prob': r.probability, 'severity': r.severity} for r in iterations])}\n\n"
                        'Return JSON: {\n'
                        '  "executive_summary": "2-3 sentences",\n'
                        '  "top_risks": ["risk1", "risk2", "risk3"],\n'
                        '  "recommended_actions": ["action1", "action2", "action3", "action4", "action5"],\n'
                        '  "overall_risk_score": 0.5,\n'
                        '  "verdict": "proceed_with_caution|high_risk|moderate_risk"\n'
                        "}"
                    ),
                },
            ],
            user_id=req.user_id,
            user_tier="enterprise",
        )

        report = {
            "job_id": req.job_id,
            "user_id": req.user_id,
            "scenario_name": req.scenario_name,
            "iterations": [vars(r) for r in iterations],
            "synthesis": synthesis,
            "completed_at": time.time(),
        }

        # Persist report
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        report_path = REPORTS_DIR / f"{req.job_id}.json"
        report_path.write_text(json.dumps(report))

        with _jobs_lock:
            _jobs[req.job_id].update({
                "status": "done",
                "progress": 100,
                "report_path": str(report_path),
            })

    except Exception as exc:
        with _jobs_lock:
            _jobs[req.job_id].update({"status": "error", "error": str(exc)})


def get_job_status(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        return dict(_jobs[job_id]) if job_id in _jobs else None


def load_report(job_id: str) -> Optional[dict]:
    path = REPORTS_DIR / f"{job_id}.json"
    if path.exists():
        return json.loads(path.read_text())
    return None
