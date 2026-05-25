"""LLM response cache (PRD §6.5).

Key:   sha256(model + system_prompt + user_messages + temperature_bucket)
       — model is part of the key so swapping providers invalidates.
TTL:   per-stage, from stages.STAGE_CACHE_TTL.
Value: JSON {text, model, input_tokens, output_tokens, ts}.

Cache writes are best-effort: a Redis outage degrades to no-cache, the
gateway keeps serving traffic. Reads are best-effort similarly.

Why temperature bucketing: random sampling at temperature > 0 makes
caching unsound for callers that *want* variety (cascade_step). We
bucket temperature to one decimal so 0.71 and 0.69 share a key — close
enough that the variation isn't perceptible to users and the cache
hit-rate stays high.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from typing import Any

from .redis_client import get_redis
from .stages import STAGE_CACHE_TTL, Stage


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CacheHit:
    text: str
    model: str
    input_tokens: int
    output_tokens: int


def _bucket_temperature(t: float) -> str:
    # 1 decimal — perceptually identical, dramatically lifts hit rate.
    return f"{round(t * 10) / 10:.1f}"


def cache_key(
    *,
    stage: Stage,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> str:
    payload = {
        "stage": stage.value,
        "model": model,
        "messages": messages,
        "t_bucket": _bucket_temperature(temperature),
        "max_tokens": max_tokens,
    }
    h = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    return f"ff:llm:{stage.value}:{h}"


def get(
    *,
    stage: Stage,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> CacheHit | None:
    if STAGE_CACHE_TTL.get(stage, 0) <= 0:
        return None
    key = cache_key(
        stage=stage, model=model, messages=messages,
        temperature=temperature, max_tokens=max_tokens,
    )
    try:
        raw = get_redis().get(key)
    except Exception as exc:  # pragma: no cover — defensive
        logger.debug("cache.get failed: %s", exc)
        return None
    if not raw:
        return None
    try:
        obj = json.loads(raw)
        return CacheHit(
            text=obj["text"],
            model=obj["model"],
            input_tokens=int(obj.get("input_tokens", 0)),
            output_tokens=int(obj.get("output_tokens", 0)),
        )
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.debug("cache value malformed for key %s: %s", key, exc)
        return None


def put(
    *,
    stage: Stage,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
    text: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    ttl = STAGE_CACHE_TTL.get(stage, 0)
    if ttl <= 0:
        return
    key = cache_key(
        stage=stage, model=model, messages=messages,
        temperature=temperature, max_tokens=max_tokens,
    )
    payload: dict[str, Any] = {
        "text": text,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
    try:
        get_redis().set(key, json.dumps(payload), ex=ttl)
    except Exception as exc:  # pragma: no cover — defensive
        logger.debug("cache.put failed: %s", exc)
