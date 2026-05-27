"""Custom domain model ontology extractor."""
from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass
from typing import Optional

from llm_gateway import Stage, complete_json

_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


@dataclass
class OntologyRequest:
    job_id: str
    user_id: str
    model_id: str
    content: str  # raw CSV text or JSON string or text description
    source_type: str  # "csv" | "json" | "text"
    name: str


def extract_async(req: OntologyRequest) -> None:
    with _jobs_lock:
        _jobs[req.job_id] = {"status": "running", "started_at": time.time()}
    t = threading.Thread(target=_extract, args=(req,), daemon=True)
    t.start()


def _extract(req: OntologyRequest) -> None:
    try:
        system = (
            "Extract structured ontology. Return only valid JSON. "
            "Never invent data not present in the source."
        )
        user_prompt = f"""You are analyzing a custom domain model for startup simulation.
Source type: {req.source_type}
Model name: {req.name}
Content: {req.content[:4000]}

Extract an ontology and generate a simulation scenario template.
Return JSON with this EXACT structure:
{{
  "ontology": {{
    "domain": "<str>",
    "key_variables": [
      {{"name": "<str>", "type": "number|boolean|select", "description": "<str>", "range": [min, max], "options": ["<str>"]}}
    ],
    "key_relationships": ["<str>"],
    "assumptions": ["<str>"]
  }},
  "scenario": {{
    "id": "custom-{req.model_id[:8]}",
    "title": "<str>",
    "description": "<str (2 sentences)>",
    "archetypes": ["visionary", "operator", "pragmatist", "contrarian", "analyst"],
    "variables": [
      {{"id": "<str>", "label": "<str>", "type": "number|boolean|select", "default": null, "min": null, "max": null, "options": null, "description": "<str>"}}
    ],
    "ontology_reference": "<str>",
    "runtime_estimate": "30-60s"
  }},
  "quality_score": 0.0,
  "quality_notes": "<str>"
}}

Quality score criteria:
- 0.9+: Rich, specific domain data with clear variables and relationships
- 0.7-0.9: Good domain coverage, usable for simulation
- 0.5-0.7: Sparse data, may produce low-fidelity results
- <0.5: Insufficient data for meaningful simulation

Be strict — only score >=0.7 if you'd stake a simulation's credibility on this domain model."""

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ]

        result = complete_json(
            stage=Stage.CUSTOM_MODEL_ONTOLOGY,
            messages=messages,
            user_id=req.user_id,
            cache=False,
        )

        quality = min(1.0, max(0.0, float(result.get("quality_score", 0.5))))

        with _jobs_lock:
            _jobs[req.job_id].update({
                "status": "done",
                "model_id": req.model_id,
                "ontology": result.get("ontology"),
                "scenario": result.get("scenario"),
                "quality_score": quality,
                "quality_notes": result.get("quality_notes", ""),
                "completed_at": time.time(),
            })
    except Exception as exc:
        with _jobs_lock:
            _jobs[req.job_id].update({"status": "error", "error": str(exc)})


def get_status(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        job = _jobs.get(job_id)
    return dict(job) if job is not None else None
