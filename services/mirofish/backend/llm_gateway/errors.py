"""Gateway-specific error types. Callers (simulation services) catch these
and decide whether to retry, fall back to a degraded mode, or surface a
failure to the user."""

from __future__ import annotations


class GatewayError(Exception):
    """Base class. Catch this if you don't care which kind of failure."""


class ConfigError(GatewayError):
    """`config/llm-routing.yaml` is missing, malformed, or references an
    unknown stage."""


class SpendCapExceeded(GatewayError):
    """The user's tier hard-cap would be exceeded by this call. The caller
    must surface a tier_restricted error to the user; we never fall back to
    a cheaper tier silently because cost predictability is the whole point
    of the cap."""

    def __init__(self, user_id: str, tier: str, cap_usd: float, current_usd: float):
        super().__init__(
            f"spend cap exceeded: user={user_id} tier={tier} "
            f"current=${current_usd:.4f} cap=${cap_usd:.2f}"
        )
        self.user_id = user_id
        self.tier = tier
        self.cap_usd = cap_usd
        self.current_usd = current_usd


class AllProvidersFailed(GatewayError):
    """Tried primary + every fallback for the resolved tier; all failed.
    The simulation should fall back to the LLM-only / degraded mode if
    possible, otherwise mark the job as failed."""

    def __init__(self, stage: str, attempts: list[tuple[str, str]]):
        # attempts: list of (provider_or_model, error_summary)
        summary = "; ".join(f"{m}: {e}" for m, e in attempts)
        super().__init__(f"all providers failed for stage {stage}: {summary}")
        self.stage = stage
        self.attempts = attempts


class RateLimitedByGateway(GatewayError):
    """Upstream returned 429 *and* every fallback was also rate-limited.
    Treated like AllProvidersFailed but kept distinct so the caller can
    apply a back-off instead of marking the job failed."""
