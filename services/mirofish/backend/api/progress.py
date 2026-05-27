"""SSE endpoint for simulation progress streaming."""
from __future__ import annotations

import hmac
import os

from flask import Blueprint, Response, abort, request

from simulation.progress import stream_events

progress_bp = Blueprint("progress", __name__, url_prefix="/internal/v1")


@progress_bp.route("/simulation/<simulation_id>/progress")
def simulation_progress(simulation_id: str) -> Response:
    """Stream SSE events for a running simulation.

    Auth: same MIROFISH_INTERNAL_TOKEN bearer check.
    """
    token = os.environ.get("MIROFISH_INTERNAL_TOKEN", "")
    auth = request.headers.get("Authorization", "")
    if not token or not hmac.compare_digest(auth, f"Bearer {token}"):
        abort(401)

    def generate():  # type: ignore[return]
        yield from stream_events(simulation_id, timeout=300.0)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
