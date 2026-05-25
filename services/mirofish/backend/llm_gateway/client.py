"""Public gateway entry points: :func:`complete` and :func:`complete_json`.

Resolves the stage to a tier via the routing config, then walks the
tier's candidate list (primary + fallbacks) in order. Each attempt:

  1. Check the circuit breaker — skip if open. *(wired in M4.5.5)*
  2. Check the user's spend cap — abort if hard cap would be exceeded. *(M4.5.8)*
  3. Check the cache — return on hit. *(M4.5.4)*
  4. Issue the request via the OpenAI-compatible OpenRouter endpoint.
  5. Record telemetry to Next.js. *(M4.5.7)*
  6. Update breaker state.

This module deliberately keeps the per-call orchestration thin; each
concern lives in its own module so it can be tested in isolation.

Current state (M4.5.1-2-3-13): steps 1, 2, 4, 5 are stubs. The client
correctly routes via stage + tier, falls back through providers on
429/5xx, supports a fully-offline mock mode, and exposes the right
shape for the upcoming concerns to plug into.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any

from openai import OpenAI
from openai import APIError, APIStatusError, RateLimitError

from . import cache as response_cache
from . import circuit_breaker as breaker
from .errors import AllProvidersFailed, RateLimitedByGateway
from .mock import deterministic_completion, deterministic_json
from .routing import RoutingConfig, get_routing_config
from .stages import Stage


logger = logging.getLogger(__name__)


# ----------------------------------------------------------------------
# Mode
# ----------------------------------------------------------------------

def _mode() -> str:
    return os.environ.get("LLM_GATEWAY_MODE", "live").lower()


def _openrouter_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    if not api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. "
            "Set it, or run with LLM_GATEWAY_MODE=mock for offline dev."
        )
    return OpenAI(
        api_key=api_key,
        base_url=base_url,
        default_headers={
            # Per OpenRouter conventions — improves analytics + free-tier prioritisation.
            "HTTP-Referer": os.environ.get("OPENROUTER_REFERRER", "https://founderfate.ai"),
            "X-Title": os.environ.get("OPENROUTER_APP_NAME", "FounderFate"),
        },
    )


# ----------------------------------------------------------------------
# Core call
# ----------------------------------------------------------------------

def _attempt_one(
    client: OpenAI,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
    response_format: dict[str, Any] | None,
) -> tuple[str, dict[str, int]]:
    """Single LLM call. Returns (text, usage)."""
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format
    resp = client.chat.completions.create(**kwargs)
    text = resp.choices[0].message.content or ""
    usage = {
        "input_tokens": getattr(resp.usage, "prompt_tokens", 0) if resp.usage else 0,
        "output_tokens": getattr(resp.usage, "completion_tokens", 0) if resp.usage else 0,
    }
    # MiniMax/DeepSeek family sometimes emit <think>...</think> reasoning blocks.
    # Inherited from upstream LLMClient; keep until we standardise on a single family.
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    return text, usage


def complete(
    *,
    stage: Stage,
    messages: list[dict[str, str]],
    user_id: str | None = None,
    simulation_id: str | None = None,
    response_format: dict[str, Any] | None = None,
    extra_overrides: dict[str, Any] | None = None,
    cache: bool = True,
) -> str:
    """Public entry point. Returns the raw model text for the resolved tier.

    Caller must always pass a Stage. The cache, breaker, spend-cap, and
    telemetry concerns are applied around the actual provider call.

    Args:
        stage: which pipeline stage is making the call — drives routing.
        messages: OpenAI chat-format list.
        user_id: for spend caps + telemetry; pass None for system jobs
            (fidelity backtests, admin scripts).
        simulation_id: links the call to a SimulationRecord for the admin UI.
        response_format: optional OpenAI JSON-mode dict.
        extra_overrides: temperature/max_tokens overrides for this single call;
            overrides stage_overrides which overrides tier defaults.
        cache: opt-out for callers that need fresh randomness.

    Raises:
        SpendCapExceeded — user cannot afford this call.
        AllProvidersFailed / RateLimitedByGateway — every candidate failed.
    """
    cfg: RoutingConfig = get_routing_config()
    tier_cfg, stage_overrides = cfg.resolve(stage)

    # Merge overrides: tier defaults < stage_overrides < extra_overrides.
    temperature = float(
        (extra_overrides or {}).get("temperature",
            stage_overrides.get("temperature", tier_cfg.temperature))
    )
    max_tokens = int(
        (extra_overrides or {}).get("max_tokens",
            stage_overrides.get("max_tokens", tier_cfg.max_tokens))
    )

    # --- Mock short-circuit ---
    if _mode() == "mock":
        text = deterministic_completion(messages, stage.value)
        # In mock mode we still pretend telemetry happened so call sites that
        # depend on UsageLog existing (e.g. tests of the spend-cap path) work.
        _record_telemetry_stub(
            stage=stage.value,
            model="mock",
            tier=tier_cfg.tier,
            provider="mock",
            user_id=user_id,
            simulation_id=simulation_id,
            input_tokens=_rough_token_count(messages),
            output_tokens=_rough_token_count([{"role": "assistant", "content": text}]),
            cost_usd=0.0,
            latency_ms=0,
            cache_hit=False,
            attempt=1,
            error_category=None,
        )
        return text

    # --- Cache check ---
    if cache:
        for candidate_model in tier_cfg.candidates():
            hit = response_cache.get(
                stage=stage, model=candidate_model, messages=messages,
                temperature=temperature, max_tokens=max_tokens,
            )
            if hit is not None:
                _record_telemetry_stub(
                    stage=stage.value,
                    model=hit.model,
                    tier=tier_cfg.tier,
                    provider="cache",
                    user_id=user_id,
                    simulation_id=simulation_id,
                    input_tokens=hit.input_tokens,
                    output_tokens=hit.output_tokens,
                    cost_usd=0.0,
                    latency_ms=0,
                    cache_hit=True,
                    attempt=1,
                    error_category=None,
                )
                return hit.text

    # --- Pre-call spend cap check (M4.5.8 will replace) ---
    _spend_cap_check_stub(user_id, tier_cfg.tier)

    # --- Real call with failover ---
    client = _openrouter_client()
    attempts: list[tuple[str, str]] = []
    last_429 = False
    for attempt_idx, model in enumerate(tier_cfg.candidates(), start=1):
        if breaker.is_open(model):
            attempts.append((model, "breaker_open"))
            continue
        started = time.monotonic()
        error_category: str | None = None
        try:
            text, usage = _attempt_one(
                client, model, messages, temperature, max_tokens, response_format
            )
            latency_ms = int((time.monotonic() - started) * 1000)
            _record_telemetry_stub(
                stage=stage.value,
                model=model,
                tier=tier_cfg.tier,
                provider="openrouter",
                user_id=user_id,
                simulation_id=simulation_id,
                input_tokens=usage["input_tokens"],
                output_tokens=usage["output_tokens"],
                cost_usd=0.0,  # filled in by M4.5.4/4.5.7 with model pricing table
                latency_ms=latency_ms,
                cache_hit=False,
                attempt=attempt_idx,
                error_category=None,
            )
            response_cache.put(
                stage=stage, model=model, messages=messages,
                temperature=temperature, max_tokens=max_tokens,
                text=text,
                input_tokens=usage["input_tokens"],
                output_tokens=usage["output_tokens"],
            )
            breaker.record_success(model)
            return text
        except RateLimitError as exc:
            error_category = "rate_limit"
            last_429 = True
            attempts.append((model, f"429: {exc}"))
        except APIStatusError as exc:
            error_category = f"http_{exc.status_code}"
            attempts.append((model, f"{exc.status_code}: {exc.message}"))
        except APIError as exc:
            error_category = "api_error"
            attempts.append((model, str(exc)))
        except Exception as exc:
            error_category = "unknown"
            attempts.append((model, repr(exc)))
            logger.exception("Unexpected error calling %s for stage %s", model, stage.value)
        finally:
            if error_category is not None:
                latency_ms = int((time.monotonic() - started) * 1000)
                _record_telemetry_stub(
                    stage=stage.value,
                    model=model,
                    tier=tier_cfg.tier,
                    provider="openrouter",
                    user_id=user_id,
                    simulation_id=simulation_id,
                    input_tokens=0,
                    output_tokens=0,
                    cost_usd=0.0,
                    latency_ms=latency_ms,
                    cache_hit=False,
                    attempt=attempt_idx,
                    error_category=error_category,
                )
                breaker.record_failure(model, error_category)

    if last_429 and all(e.startswith("429") for _, e in attempts):
        raise RateLimitedByGateway(stage.value, attempts)
    raise AllProvidersFailed(stage.value, attempts)


def complete_json(
    *,
    stage: Stage,
    messages: list[dict[str, str]],
    user_id: str | None = None,
    simulation_id: str | None = None,
    extra_overrides: dict[str, Any] | None = None,
    cache: bool = True,
) -> dict[str, Any]:
    """Convenience wrapper that requests JSON-mode and parses the response."""
    if _mode() == "mock":
        return deterministic_json(messages, stage.value)
    text = complete(
        stage=stage,
        messages=messages,
        user_id=user_id,
        simulation_id=simulation_id,
        response_format={"type": "json_object"},
        extra_overrides=extra_overrides,
        cache=cache,
    )
    # Strip code fences that some models add even in JSON mode.
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\n?```\s*$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"gateway returned non-JSON for stage {stage.value}: {cleaned[:200]}") from exc


# ----------------------------------------------------------------------
# Stubs — replaced in subsequent M4.5 commits
# ----------------------------------------------------------------------

def _rough_token_count(messages: list[dict[str, str]]) -> int:
    """4-chars-per-token heuristic. Replaced by tiktoken/anthropic
    tokeniser in M4.5.9."""
    total = 0
    for m in messages:
        total += len(m.get("content", "")) // 4
    return total


def _spend_cap_check_stub(_user_id: str | None, _tier: str) -> None:
    # Replaced in M4.5.8.
    return None


def _record_telemetry_stub(**_kwargs: Any) -> None:
    # Replaced in M4.5.7 with a POST to /api/internal/usage on Next.js.
    # For now we just log so dev can see the shape.
    logger.debug("usage stub: %s", _kwargs)
