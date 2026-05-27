"""In-process SSE event queue for simulation progress.

Each simulation_id maps to a queue. The SSE endpoint reads from it.
Events are dropped after MAX_QUEUE_AGE seconds if nobody is listening.
"""
from __future__ import annotations

import json
import queue
import threading
import time
from typing import Any

_queues: dict[str, queue.Queue[dict[str, Any]]] = {}
_lock = threading.Lock()
MAX_QUEUE_AGE = 3600  # 1 hour


def _get_or_create(sim_id: str) -> queue.Queue[dict[str, Any]]:
    with _lock:
        if sim_id not in _queues:
            _queues[sim_id] = queue.Queue(maxsize=500)
        return _queues[sim_id]


def push_event(sim_id: str, event_type: str, data: dict[str, Any]) -> None:
    q = _get_or_create(sim_id)
    payload: dict[str, Any] = {"event": event_type, "data": data, "ts": time.time()}
    try:
        q.put_nowait(payload)
    except queue.Full:
        pass  # Drop new event when queue is full


def push_done(sim_id: str, results: dict[str, Any]) -> None:
    push_event(sim_id, "done", results)


def push_error(sim_id: str, error_code: str, detail: str) -> None:
    push_event(sim_id, "error", {"code": error_code, "detail": detail})


def stream_events(sim_id: str, timeout: float = 120.0):  # type: ignore[return]
    """Generator yielding SSE-formatted strings. Yields keepalives every 15s."""
    q = _get_or_create(sim_id)
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            payload = q.get(timeout=15.0)
            yield f"data: {json.dumps(payload)}\n\n"
            if payload["event"] in ("done", "error"):
                break
        except queue.Empty:
            yield ": keepalive\n\n"


def cleanup(sim_id: str) -> None:
    with _lock:
        _queues.pop(sim_id, None)
