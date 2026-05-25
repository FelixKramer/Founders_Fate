"""Telemetry: emit a UsageLog row to Next.js for every LLM call.

Wire format (POST /api/internal/usage on Next.js, bearer-auth via
MIROFISH_INTERNAL_TOKEN):

    {
      "user_id": "usr_..." | null,
      "simulation_id": "sim_..." | null,
      "stage": "node_narrative",
      "model": "openai/gpt-4o-mini",
      "tier": "M",
      "provider": "openrouter" | "cache" | "mock" | ...,
      "input_tokens": 1234,
      "output_tokens": 567,
      "cost_usd": 0.001234,
      "latency_ms": 1820,
      "cache_hit": false,
      "attempt": 1,
      "error_category": null | "rate_limit" | "http_500" | ...
    }

Network: fire-and-forget via an in-process queue + background thread.
Failures are logged once per minute (suppressed otherwise) so a Next.js
outage doesn't spam Sentry. We never block an LLM call on telemetry.

In LLM_GATEWAY_MODE=mock the emitter still queues so tests can assert
shape; the worker thread is started lazily on first use.
"""

from __future__ import annotations

import json
import logging
import os
import queue
import threading
import time
from typing import Any

import httpx


logger = logging.getLogger(__name__)

_USAGE_LOG_PATH = "/api/internal/usage"
_FLUSH_BATCH = 25
_FLUSH_INTERVAL_SEC = 1.0
_MAX_QUEUED = 5_000
_ERROR_LOG_INTERVAL_SEC = 60.0


_queue: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=_MAX_QUEUED)
_worker_started = False
_worker_lock = threading.Lock()
_last_error_log = 0.0


def _endpoint() -> str | None:
    base = os.environ.get("USAGE_LOG_ENDPOINT")
    if not base:
        # Try to derive from MIROFISH_URL — useful in docker-compose where
        # both services share a network.
        web = os.environ.get("APP_URL") or os.environ.get("NEXTAUTH_URL")
        if web:
            base = web.rstrip("/") + _USAGE_LOG_PATH
        else:
            return None
    return base if base.endswith(_USAGE_LOG_PATH) else base.rstrip("/") + _USAGE_LOG_PATH


def _token() -> str | None:
    return os.environ.get("USAGE_LOG_TOKEN") or os.environ.get("MIROFISH_INTERNAL_TOKEN")


def _worker() -> None:
    global _last_error_log
    batch: list[dict[str, Any]] = []
    last_flush = time.monotonic()
    timeout = httpx.Timeout(5.0)
    while True:
        try:
            try:
                item = _queue.get(timeout=_FLUSH_INTERVAL_SEC)
                batch.append(item)
            except queue.Empty:
                pass

            now = time.monotonic()
            should_flush = batch and (
                len(batch) >= _FLUSH_BATCH or now - last_flush >= _FLUSH_INTERVAL_SEC
            )
            if not should_flush:
                continue

            endpoint = _endpoint()
            token = _token()
            if endpoint and token:
                try:
                    with httpx.Client(timeout=timeout) as c:
                        r = c.post(
                            endpoint,
                            json={"events": batch},
                            headers={"authorization": f"Bearer {token}"},
                        )
                    if r.status_code >= 400:
                        _maybe_log_error(
                            f"usage POST returned {r.status_code}: {r.text[:200]}"
                        )
                except Exception as exc:
                    _maybe_log_error(f"usage POST failed: {exc}")
            batch = []
            last_flush = now
        except Exception as exc:  # pragma: no cover — keep the worker alive
            logger.exception("telemetry worker error: %s", exc)
            time.sleep(1)


def _maybe_log_error(msg: str) -> None:
    global _last_error_log
    now = time.monotonic()
    if now - _last_error_log >= _ERROR_LOG_INTERVAL_SEC:
        logger.warning(msg)
        _last_error_log = now


def _start_worker_if_needed() -> None:
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if _worker_started:
            return
        t = threading.Thread(target=_worker, name="llm-telemetry", daemon=True)
        t.start()
        _worker_started = True


def emit(
    *,
    stage: str,
    model: str,
    tier: str,
    provider: str,
    user_id: str | None,
    simulation_id: str | None,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    latency_ms: int,
    cache_hit: bool,
    attempt: int,
    error_category: str | None,
) -> None:
    _start_worker_if_needed()
    event = {
        "user_id": user_id,
        "simulation_id": simulation_id,
        "stage": stage,
        "model": model,
        "tier": tier,
        "provider": provider,
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "cost_usd": round(float(cost_usd), 6),
        "latency_ms": int(latency_ms),
        "cache_hit": bool(cache_hit),
        "attempt": int(attempt),
        "error_category": error_category,
    }
    try:
        _queue.put_nowait(event)
    except queue.Full:
        # Drop oldest, keep newest — better than blocking the LLM caller.
        try:
            _queue.get_nowait()
        except queue.Empty:
            pass
        try:
            _queue.put_nowait(event)
        except queue.Full:  # pragma: no cover
            _maybe_log_error("telemetry queue saturated; dropping event")


# --- Test helpers ---

def drain_for_tests() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        while True:
            out.append(_queue.get_nowait())
    except queue.Empty:
        return out


def reset_for_tests() -> None:
    global _worker_started
    drain_for_tests()
    _worker_started = True  # prevent the daemon worker from spawning in tests
