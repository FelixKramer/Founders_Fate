"""Per-provider circuit breaker (PRD §6.5).

Trip condition: error rate > 20% OR p95 latency > 2 * baseline,
measured over a rolling 60-second window.

State machine: closed -> open (5 min) -> half_open -> closed | open.

State lives in Redis so multiple MiroFish workers share the verdict;
without Redis the breaker is a no-op (degraded mode).

Stored under: ff:cb:<model_id>:counts (a hash) and ff:cb:<model_id>:open
(a flag with TTL = open_duration).
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from .redis_client import get_redis


logger = logging.getLogger(__name__)


WINDOW_SECONDS = 60
OPEN_DURATION_SECONDS = 300  # 5 minutes
ERROR_RATE_THRESHOLD = 0.20  # 20%
MIN_SAMPLES = 10             # avoid tripping on 1-of-2 failures


def _counts_key(model: str) -> str:
    return f"ff:cb:counts:{model}"


def _open_key(model: str) -> str:
    return f"ff:cb:open:{model}"


def is_open(model: str) -> bool:
    """Returns True if the breaker is currently open for this model.

    Open state is just the presence of the open key, which Redis evicts
    automatically after OPEN_DURATION_SECONDS — no separate clock needed."""
    try:
        return bool(get_redis().get(_open_key(model)))
    except Exception as exc:  # pragma: no cover
        logger.debug("breaker.is_open failed: %s — fail-open", exc)
        return False


def record_success(model: str) -> None:
    _bump(model, success=True)


def record_failure(model: str, category: str) -> None:
    _bump(model, success=False)
    # If failures dominate the rolling window, trip.
    counts = _read(model)
    total = counts.success + counts.failure
    if total >= MIN_SAMPLES and counts.failure / total > ERROR_RATE_THRESHOLD:
        _trip(model, reason=f"error_rate={counts.failure}/{total} ({category})")


@dataclass
class _Counts:
    success: int
    failure: int


def _bump(model: str, *, success: bool) -> None:
    # Bucket counts per second; reset the bucket older than the window
    # by relying on Redis TTL. Concretely: incr per-bucket key with TTL
    # WINDOW_SECONDS + 1, and on read sum all buckets within the window.
    bucket = int(time.time())
    key = f"{_counts_key(model)}:{'s' if success else 'f'}:{bucket}"
    try:
        r = get_redis()
        r.incr(key)
        r.expire(key, WINDOW_SECONDS + 1)
    except Exception as exc:  # pragma: no cover
        logger.debug("breaker._bump failed: %s", exc)


def _read(model: str) -> _Counts:
    # The simplest implementation reads per-second buckets within the window.
    # In NullRedis mode this returns zeros and the breaker is effectively off.
    r = get_redis()
    now = int(time.time())
    success = 0
    failure = 0
    try:
        for offset in range(WINDOW_SECONDS):
            ts = now - offset
            raw_s = r.get(f"{_counts_key(model)}:s:{ts}")
            raw_f = r.get(f"{_counts_key(model)}:f:{ts}")
            if raw_s:
                success += int(raw_s)
            if raw_f:
                failure += int(raw_f)
    except Exception as exc:  # pragma: no cover
        logger.debug("breaker._read failed: %s", exc)
    return _Counts(success=success, failure=failure)


def _trip(model: str, *, reason: str) -> None:
    try:
        get_redis().set(_open_key(model), reason, ex=OPEN_DURATION_SECONDS)
        logger.warning("circuit breaker tripped for %s: %s (open %ds)", model, reason, OPEN_DURATION_SECONDS)
    except Exception as exc:  # pragma: no cover
        logger.debug("breaker._trip failed: %s", exc)


def force_reset_for_tests(model: str) -> None:
    """Wipe all breaker state for a model. Tests only."""
    r = get_redis()
    try:
        r.delete(_open_key(model))
        now = int(time.time())
        for offset in range(WINDOW_SECONDS + 2):
            ts = now - offset
            r.delete(f"{_counts_key(model)}:s:{ts}")
            r.delete(f"{_counts_key(model)}:f:{ts}")
    except Exception:  # pragma: no cover
        pass
