"""Per-user monthly spend caps (PRD §6.5).

Soft alert + hard cap per tier (see tier_caps table). State lives in
Redis under ff:spend:<user_id>:<YYYY-MM> as an incrementing float.

Pre-call check:
  - If projected_total > hard_cap, raise SpendCapExceeded.
  - If actual_total just crossed the soft_alert, emit a one-time
    fate_spend_soft_alert event.

Post-call: caller updates the counter with the actual cost from
telemetry. We don't decrement on cache hits (they cost $0) or mock
mode.

Without Redis, all checks pass through silently — same fail-open
behaviour as the rest of the gateway.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from .errors import SpendCapExceeded
from .redis_client import get_redis


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Cap:
    soft_alert_usd: float
    hard_cap_usd: float


# Mirrors src/lib/tier.ts SPEND_CAPS — keep in lockstep.
TIER_CAPS: dict[str, Cap] = {
    "free":       Cap(soft_alert_usd=1.0,  hard_cap_usd=2.0),
    "pro":        Cap(soft_alert_usd=20.0, hard_cap_usd=40.0),
    "enterprise": Cap(soft_alert_usd=float("inf"), hard_cap_usd=float("inf")),
}


def _key(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return f"ff:spend:{user_id}:{now.year:04d}-{now.month:02d}"


def _soft_flag_key(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return f"ff:spend:soft:{user_id}:{now.year:04d}-{now.month:02d}"


def current_spend_usd(user_id: str) -> float:
    """Returns the running month-to-date spend for the user."""
    try:
        raw = get_redis().get(_key(user_id))
    except Exception as exc:  # pragma: no cover
        logger.debug("spend.current failed: %s — assume zero", exc)
        return 0.0
    if not raw:
        return 0.0
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def check_before_call(user_id: str | None, tier: str, projected_cost_usd: float = 0.0) -> None:
    """Raise SpendCapExceeded if the *projected* total after this call
    would exceed the tier hard cap.

    Pass projected_cost_usd=0 for a pre-call check on top of historical
    usage only. For a tighter check, pass a max-tokens-based upper-bound
    estimate.
    """
    if not user_id:
        return  # system jobs
    cap = TIER_CAPS.get(tier)
    if cap is None:
        return
    if cap.hard_cap_usd == float("inf"):
        return
    spent = current_spend_usd(user_id)
    if spent + projected_cost_usd > cap.hard_cap_usd:
        raise SpendCapExceeded(user_id, tier, cap.hard_cap_usd, spent + projected_cost_usd)


def record_actual(user_id: str | None, tier: str, actual_cost_usd: float) -> None:
    """Update the running counter; emit one soft-alert event when first
    crossed (no spam)."""
    if not user_id or actual_cost_usd <= 0:
        return
    cap = TIER_CAPS.get(tier)
    if cap is None:
        return
    try:
        r = get_redis()
        new_total = r.incrbyfloat(_key(user_id), actual_cost_usd)
        # TTL on first write — 35 days covers any billing-cycle slop.
        r.expire(_key(user_id), 35 * 24 * 3600)
    except Exception as exc:  # pragma: no cover
        logger.debug("spend.record failed: %s", exc)
        return

    # Soft alert: emit once per user per month when crossing the line.
    if cap.soft_alert_usd != float("inf") and new_total >= cap.soft_alert_usd:
        try:
            already = r.get(_soft_flag_key(user_id))
            if not already:
                r.set(_soft_flag_key(user_id), "1", ex=35 * 24 * 3600, nx=True)
                logger.warning(
                    "spend soft alert: user=%s tier=%s month_to_date=$%.4f cap=$%.2f",
                    user_id, tier, new_total, cap.soft_alert_usd,
                )
                # Real notification dispatch happens via the admin email queue
                # consumer (M15.4); here we log + let Next.js side notice via
                # /admin/llm dashboard polling.
        except Exception:  # pragma: no cover
            pass
