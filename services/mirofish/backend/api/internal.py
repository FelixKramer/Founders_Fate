"""Internal API blueprint — all endpoints require MIROFISH_INTERNAL_TOKEN.

Endpoints:
  POST   /internal/v1/simulation/run
  GET    /internal/v1/simulation/<id>/results
  POST   /internal/v1/simulation/<id>/cancel
  POST   /internal/v1/simulation/<id>/premortem
  GET    /internal/v1/simulation/status
  POST   /internal/v1/dna/generate
  GET    /internal/v1/dna/status/<job_id>
  GET    /internal/v1/dna/report/<user_id>
  POST   /internal/v1/models/extract
  GET    /internal/v1/models/<job_id>/status
  POST   /internal/v1/premortem/parse-and-run
  GET    /internal/v1/premortem/<job_id>/status
  GET    /internal/v1/premortem/<job_id>/pdf
"""
from __future__ import annotations

import hmac
import logging
import os
import time
import threading
import uuid
from typing import Any

from flask import Blueprint, abort, jsonify, request, send_file

from llm_gateway import Stage, complete_json
from simulation.ontology_extractor import (
    extract_async,
    get_status as get_ontology_status,
    OntologyRequest,
)

logger = logging.getLogger(__name__)

# ── Blueprint ──────────────────────────────────────────────────────────────────

internal_bp = Blueprint("internal", __name__, url_prefix="/internal/v1")

# ── Concurrency state ──────────────────────────────────────────────────────────

_running: dict[str, threading.Thread] = {}
_running_lock = threading.Lock()
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT_SIMS", "5"))

# ── Results store ──────────────────────────────────────────────────────────────

_results: dict[str, dict[str, Any]] = {}
_results_lock = threading.Lock()

# ── DNA job registry ───────────────────────────────────────────────────────────

_dna_jobs: dict[str, dict] = {}
_dna_jobs_lock = threading.Lock()

# ── Cancellation flags ─────────────────────────────────────────────────────────

_cancel_flags: dict[str, threading.Event] = {}
_cancel_lock = threading.Lock()


# ── Auth helper ────────────────────────────────────────────────────────────────


@internal_bp.before_request
def verify_internal_token() -> None:
    token = os.environ.get("MIROFISH_INTERNAL_TOKEN", "")
    auth = request.headers.get("Authorization", "")
    expected = f"Bearer {token}"
    # Use constant-time comparison to resist timing attacks
    if not token or not hmac.compare_digest(auth, expected):
        abort(401, description="Unauthorized")


# ── Public helpers (called by pipeline thread) ─────────────────────────────────


def store_result(sim_id: str, result: dict[str, Any]) -> None:
    """Store completed simulation results. Called from the pipeline thread."""
    with _results_lock:
        _results[sim_id] = result
    # Remove from running map now that it's done
    with _running_lock:
        _running.pop(sim_id, None)


def get_result(sim_id: str) -> dict[str, Any] | None:
    """Return stored result or None if not found."""
    with _results_lock:
        return _results.get(sim_id)


# ── POST /internal/v1/simulation/run ──────────────────────────────────────────


@internal_bp.post("/simulation/run")
def run_simulation():  # type: ignore[return]
    """Validate the request body, spawn a pipeline thread, return 202."""
    body = request.get_json(silent=True)
    if not body or not isinstance(body, dict):
        abort(400, description="Request body must be a JSON object")

    # Required fields
    required = [
        "simulation_id",
        "user_tier",
        "scenario_id",
        "archetype",
        "decision_option_id",
        "parameters",
        "seed",
    ]
    missing = [f for f in required if f not in body]
    if missing:
        abort(400, description=f"Missing required fields: {', '.join(missing)}")

    simulation_id: str = body["simulation_id"]
    user_id: str | None = body.get("user_id")
    user_tier: str = body["user_tier"]
    scenario_id: str = body["scenario_id"]
    archetype: str = body["archetype"]
    decision_option_id: str = body["decision_option_id"]
    parameters: dict[str, Any] = body["parameters"]
    seed: str = body["seed"]
    model_tier_override: str | None = body.get("model_tier_override")

    if user_tier not in ("free", "pro", "enterprise"):
        abort(400, description="user_tier must be 'free', 'pro', or 'enterprise'")
    if not isinstance(parameters, dict):
        abort(400, description="parameters must be a JSON object")

    # Sanitize parameters to prevent prompt injection attacks.
    from simulation.sanitizer import sanitize_parameters  # noqa: PLC0415
    try:
        parameters = sanitize_parameters(parameters)
    except ValueError as exc:
        abort(400, description=str(exc))

    # Concurrency limit
    with _running_lock:
        if len(_running) >= MAX_CONCURRENT:
            return (
                jsonify({"error": "too_many_simulations", "active": len(_running), "max": MAX_CONCURRENT}),
                429,
            )

    # Create cancellation flag
    cancel_flag = threading.Event()
    with _cancel_lock:
        _cancel_flags[simulation_id] = cancel_flag

    # Build request and spawn thread
    from simulation.pipeline import SimulationRequest, run_pipeline  # noqa: PLC0415

    sim_req = SimulationRequest(
        simulation_id=simulation_id,
        user_id=user_id,
        user_tier=user_tier,
        scenario_id=scenario_id,
        archetype=archetype,
        decision_option_id=decision_option_id,
        parameters=parameters,
        seed=seed,
        model_tier_override=model_tier_override,
        cancel_flag=cancel_flag,
    )

    def _run() -> None:
        try:
            run_pipeline(sim_req)
        except Exception:
            logger.exception("Unhandled error in simulation thread %s", simulation_id)
        finally:
            with _running_lock:
                _running.pop(simulation_id, None)
            with _cancel_lock:
                _cancel_flags.pop(simulation_id, None)

    t = threading.Thread(target=_run, name=f"sim-{simulation_id}", daemon=True)
    with _running_lock:
        _running[simulation_id] = t
    t.start()

    return jsonify({"status": "queued", "simulation_id": simulation_id}), 202


# ── GET /internal/v1/simulation/<id>/results ─────────────────────────────────


@internal_bp.get("/simulation/<simulation_id>/results")
def get_simulation_results(simulation_id: str):  # type: ignore[return]
    """Return stored results, 202 if still running, 404 if unknown."""
    result = get_result(simulation_id)
    if result is not None:
        return jsonify(result), 200

    # Check if it's currently running
    with _running_lock:
        still_running = simulation_id in _running
    if still_running:
        return jsonify({"status": "running", "simulation_id": simulation_id}), 202

    abort(404, description=f"Simulation {simulation_id!r} not found")


# ── POST /internal/v1/simulation/<id>/cancel ─────────────────────────────────


@internal_bp.post("/simulation/<simulation_id>/cancel")
def cancel_simulation(simulation_id: str):  # type: ignore[return]
    """Set the cancellation flag for a running simulation."""
    with _cancel_lock:
        flag = _cancel_flags.get(simulation_id)

    if flag is None:
        # Check whether it completed (results stored)
        result = get_result(simulation_id)
        if result is not None:
            return jsonify({"cancelled": False, "reason": "already_completed"}), 200
        abort(404, description=f"Simulation {simulation_id!r} not found or not running")

    flag.set()
    return jsonify({"cancelled": True, "simulation_id": simulation_id}), 200


# ── POST /internal/v1/simulation/<id>/premortem ───────────────────────────────


@internal_bp.post("/simulation/<simulation_id>/premortem")
def run_premortem(simulation_id: str):  # type: ignore[return]
    """Run a pre-mortem analysis over a completed simulation's results."""
    result = get_result(simulation_id)
    if result is None:
        # Still running?
        with _running_lock:
            still_running = simulation_id in _running
        if still_running:
            return jsonify({"status": "running", "simulation_id": simulation_id}), 202
        abort(404, description=f"Simulation {simulation_id!r} not found")

    body = request.get_json(silent=True) or {}
    perspective = body.get("perspective", "realist")
    if perspective not in ("optimist", "pessimist", "realist"):
        abort(400, description="perspective must be 'optimist', 'pessimist', or 'realist'")

    prompt = {
        "task": "premortem_analysis",
        "simulation_id": simulation_id,
        "perspective": perspective,
        "simulation_results": {
            "scenario_id": result.get("scenario_id"),
            "archetype": result.get("archetype"),
            "decision_option_id": result.get("decision_option_id"),
            "narrative": result.get("narrative"),
            "key_risks": result.get("key_risks", []),
            "upside_scenarios": result.get("upside_scenarios", []),
            "confidence_score": result.get("confidence_score"),
            "consequence_tree_root": (result.get("consequence_tree") or {}).get("root"),
        },
        "instruction": (
            f"You are analysing this simulation from the perspective of a {perspective}. "
            "Perform a pre-mortem analysis: assume the worst outcome happened and work backwards "
            "to explain why. "
            "Return JSON: { "
            "narrative: str (3–4 sentences), "
            "failure_modes: [str] (3–5 items), "
            "success_conditions: [str] (2–3 items) "
            "}"
        ),
    }

    import json  # noqa: PLC0415 — local to keep module-level imports clean

    premortem_result = complete_json(
        stage=Stage.PREMORTEM,
        messages=[{"role": "user", "content": json.dumps(prompt)}],
        user_id=None,
        user_tier="enterprise",
        simulation_id=simulation_id,
    )

    return jsonify({
        "simulation_id": simulation_id,
        "perspective": perspective,
        "narrative": premortem_result.get("narrative", ""),
        "failure_modes": premortem_result.get("failure_modes", []),
        "success_conditions": premortem_result.get("success_conditions", []),
    }), 200


# ── GET /internal/v1/simulation/status ───────────────────────────────────────


@internal_bp.get("/simulation/status")
def simulation_status():  # type: ignore[return]
    """Return concurrency stats."""
    with _running_lock:
        active = len(_running)
    return jsonify({"active": active, "max": MAX_CONCURRENT}), 200


# ── POST /internal/v1/dna/generate ───────────────────────────────────────────


@internal_bp.post("/dna/generate")
def dna_generate():  # type: ignore[return]
    """Validate body, spawn background DNA report thread, return 202."""
    body = request.get_json(silent=True)
    if not body or not isinstance(body, dict):
        abort(400, description="Request body must be a JSON object")

    user_id: str | None = body.get("user_id")
    simulation_summaries: list | None = body.get("simulation_summaries")

    if not user_id or not isinstance(user_id, str):
        abort(400, description="Missing required field: user_id")
    if not simulation_summaries or not isinstance(simulation_summaries, list):
        abort(400, description="Missing required field: simulation_summaries (must be a list)")
    if len(simulation_summaries) < 3:
        abort(400, description="At least 3 simulation_summaries are required to generate a DNA report")

    job_id = f"dna_{user_id}_{int(time.time())}"

    with _dna_jobs_lock:
        _dna_jobs[job_id] = {"status": "queued", "result": None, "error": None}

    from simulation.dna import generate_dna_report  # noqa: PLC0415

    def _run() -> None:
        with _dna_jobs_lock:
            registry = _dna_jobs
        generate_dna_report(user_id, simulation_summaries, job_id, registry)

    t = threading.Thread(target=_run, name=f"dna-{job_id}", daemon=True)
    t.start()

    return jsonify({"job_id": job_id, "status": "queued"}), 202


# ── GET /internal/v1/dna/status/<job_id> ──────────────────────────────────────


@internal_bp.get("/dna/status/<job_id>")
def dna_status(job_id: str):  # type: ignore[return]
    """Return current status of a DNA generation job."""
    with _dna_jobs_lock:
        job = _dna_jobs.get(job_id)

    if job is None:
        abort(404, description=f"DNA job {job_id!r} not found")

    return jsonify({
        "status": job["status"],
        "result": job["result"],
        "error": job["error"],
    }), 200


# ── GET /internal/v1/dna/report/<user_id> ─────────────────────────────────────


@internal_bp.get("/dna/report/<user_id>")
def dna_report(user_id: str):  # type: ignore[return]
    """Return the persisted DNA report for a user, or 404 if not yet generated."""
    from simulation.dna import load_report  # noqa: PLC0415

    report = load_report(user_id)
    if report is None:
        abort(404, description=f"No DNA report found for user {user_id!r}")

    return jsonify(report), 200


# ── POST /internal/v1/models/extract ─────────────────────────────────────────


@internal_bp.post("/models/extract")
def extract_model_ontology():  # type: ignore[return]
    """Accept a custom domain model payload, spawn async ontology extraction, return job_id."""
    data = request.get_json(force=True)
    if not data or not isinstance(data, dict):
        abort(400, description="Request body must be a JSON object")

    user_id = data.get("user_id")
    model_id = data.get("model_id")
    content = data.get("content")

    if not user_id or not model_id or not content:
        abort(400, description="Missing required fields: user_id, model_id, content")

    job_id = str(uuid.uuid4())
    req = OntologyRequest(
        job_id=job_id,
        user_id=str(user_id),
        model_id=str(model_id),
        content=str(content),
        source_type=str(data.get("source_type", "text")),
        name=str(data.get("name", "Custom Model")),
    )
    extract_async(req)
    return jsonify({"job_id": job_id}), 202


# ── GET /internal/v1/models/<job_id>/status ───────────────────────────────────


@internal_bp.get("/models/<job_id>/status")
def model_extract_status(job_id: str):  # type: ignore[return]
    """Return current status of an ontology extraction job."""
    status = get_ontology_status(job_id)
    if status is None:
        abort(404, description=f"Ontology job {job_id!r} not found")
    return jsonify(status), 200


# ── POST /internal/v1/premortem/parse-and-run ─────────────────────────────────


@internal_bp.post("/premortem/parse-and-run")
def premortem_parse_and_run():  # type: ignore[return]
    """Accept multipart (file or url) + metadata, parse content, kick off pre-mortem."""
    from simulation.doc_parser import parse_pdf, parse_docx, parse_url  # noqa: PLC0415
    from simulation.premortem import PremortemRequest, run_premortem_async  # noqa: PLC0415

    scenario_name = request.form.get("scenario_name", "Pre-Mortem Analysis")
    user_id = request.form.get("user_id", "unknown")

    content = ""
    if "file" in request.files:
        f = request.files["file"]
        file_bytes = f.read()
        filename = (f.filename or "").lower()
        if filename.endswith(".pdf"):
            content = parse_pdf(file_bytes)
        elif filename.endswith(".docx"):
            content = parse_docx(file_bytes)
        else:
            content = file_bytes.decode("utf-8", errors="replace")[:10000]
    elif url := request.form.get("url"):
        content = parse_url(url)
    else:
        abort(400, description="provide file or url")

    job_id = str(uuid.uuid4())
    req = PremortemRequest(
        job_id=job_id,
        user_id=user_id,
        content=content,
        scenario_name=scenario_name,
    )
    run_premortem_async(req)
    return jsonify({"job_id": job_id, "status": "queued"}), 202


# ── GET /internal/v1/premortem/<job_id>/status ────────────────────────────────


@internal_bp.get("/premortem/<job_id>/status")
def premortem_job_status(job_id: str):  # type: ignore[return]
    """Return current status/progress of a pre-mortem job."""
    from simulation.premortem import get_job_status  # noqa: PLC0415

    status = get_job_status(job_id)
    if status is None:
        abort(404, description=f"Pre-mortem job {job_id!r} not found")
    return jsonify(status), 200


# ── GET /internal/v1/premortem/<job_id>/pdf ───────────────────────────────────


@internal_bp.get("/premortem/<job_id>/pdf")
def premortem_job_pdf(job_id: str):  # type: ignore[return]
    """Generate (if needed) and stream the PDF report for a completed job."""
    from simulation.premortem import load_report  # noqa: PLC0415
    from simulation.premortem_pdf import generate_pdf  # noqa: PLC0415
    from pathlib import Path  # noqa: PLC0415

    report = load_report(job_id)
    if report is None:
        abort(404, description="report not ready")

    pdf_path = Path(f"/data/uploads/premortem/{job_id}.pdf")
    if not pdf_path.exists():
        generate_pdf(report, pdf_path)

    return send_file(
        str(pdf_path),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"premortem-{job_id[:8]}.pdf",
    )
