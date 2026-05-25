"""Shared Redis connection for cache, circuit-breaker, and spend-cap modules.

Connection target:
  REDIS_URL   — full URL (e.g. redis://redis:6379/0) for local docker
                or for a self-hosted Redis. Used when present.
  UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN — Upstash REST API,
                used when REDIS_URL is unset. Slower per-op but works
                everywhere including serverless. We use the synchronous
                upstash_redis client (a thin wrapper over httpx) so this
                module stays sync-only.

If neither is configured, returns a NullRedis stub: every operation is a
no-op so the gateway still serves traffic in degraded mode (no cache,
no breaker, no spend cap) — matches what we'd do if Redis itself were
down per PRD §13 fallback rules.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Protocol


logger = logging.getLogger(__name__)


class RedisLike(Protocol):
    """Minimum surface used by the gateway."""

    def get(self, key: str) -> Any: ...
    def set(self, key: str, value: str, ex: int | None = None, nx: bool | None = None) -> Any: ...
    def incrbyfloat(self, key: str, amount: float) -> float: ...
    def incr(self, key: str) -> int: ...
    def expire(self, key: str, seconds: int) -> Any: ...
    def delete(self, key: str) -> Any: ...
    def ping(self) -> Any: ...


class _NullRedis:
    """Drop-in stub when Redis is unconfigured or unreachable.

    Get returns None; mutations are no-ops; counters return 0. This makes
    the gateway gracefully degrade rather than failing closed."""

    def get(self, key: str) -> None:  # noqa: ARG002
        return None

    def set(self, key: str, value: str, ex: int | None = None, nx: bool | None = None) -> None:  # noqa: ARG002
        return None

    def incrbyfloat(self, key: str, amount: float) -> float:  # noqa: ARG002
        return 0.0

    def incr(self, key: str) -> int:  # noqa: ARG002
        return 0

    def expire(self, key: str, seconds: int) -> None:  # noqa: ARG002
        return None

    def delete(self, key: str) -> None:  # noqa: ARG002
        return None

    def ping(self) -> bool:
        return False


_client: RedisLike | None = None


def get_redis() -> RedisLike:
    global _client
    if _client is not None:
        return _client

    url = os.environ.get("REDIS_URL")
    if url:
        try:
            import redis  # type: ignore[import-not-found]
            _client = redis.Redis.from_url(url, decode_responses=True, socket_timeout=2)
            _client.ping()
            return _client
        except Exception as exc:
            logger.warning("Redis (REDIS_URL=%s) unavailable: %s — using NullRedis", url, exc)
            _client = _NullRedis()
            return _client

    upstash_url = os.environ.get("UPSTASH_REDIS_REST_URL")
    upstash_tok = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if upstash_url and upstash_tok:
        try:
            from upstash_redis import Redis as UpstashRedis  # type: ignore[import-not-found]
            _client = UpstashRedis(url=upstash_url, token=upstash_tok)
            _client.ping()
            return _client
        except Exception as exc:
            logger.warning("Upstash Redis unavailable: %s — using NullRedis", exc)
            _client = _NullRedis()
            return _client

    logger.info("No Redis configured — gateway runs without cache/breaker/spend-cap.")
    _client = _NullRedis()
    return _client


def reset_for_tests() -> None:
    global _client
    _client = None
