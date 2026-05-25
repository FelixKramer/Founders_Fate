"""Spend cap tests using FakeRedis."""

from __future__ import annotations

import pytest

from llm_gateway import redis_client
from llm_gateway import spend_cap
from llm_gateway.errors import SpendCapExceeded
from tests.llm_gateway.test_cache import FakeRedis  # reuse fixture


@pytest.fixture(autouse=True)
def _fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(redis_client, "_client", fake)
    yield fake
    redis_client.reset_for_tests()


USER = "usr_abc"


def test_free_tier_blocks_at_hard_cap() -> None:
    # Free hard cap is $2 — push spend to $1.99, then a $0.02 projected call should raise.
    spend_cap.record_actual(USER, "free", 1.99)
    with pytest.raises(SpendCapExceeded) as exc:
        spend_cap.check_before_call(USER, "free", projected_cost_usd=0.02)
    assert exc.value.tier == "free"
    assert exc.value.cap_usd == 2.0


def test_free_tier_passes_below_hard_cap() -> None:
    spend_cap.record_actual(USER, "free", 1.50)
    # No projected cost passed — pure history check.
    spend_cap.check_before_call(USER, "free")


def test_pro_tier_has_higher_cap() -> None:
    spend_cap.record_actual(USER, "pro", 3.00)
    # Free cap would block, pro should pass.
    spend_cap.check_before_call(USER, "pro", projected_cost_usd=0.01)


def test_enterprise_never_blocks() -> None:
    spend_cap.record_actual(USER, "enterprise", 1_000.00)
    spend_cap.check_before_call(USER, "enterprise", projected_cost_usd=100.0)


def test_anonymous_user_skipped() -> None:
    # user_id=None means system job; cap doesn't apply.
    spend_cap.check_before_call(None, "free", projected_cost_usd=999.0)


def test_record_actual_accumulates() -> None:
    spend_cap.record_actual(USER, "pro", 1.10)
    spend_cap.record_actual(USER, "pro", 2.40)
    assert spend_cap.current_spend_usd(USER) == pytest.approx(3.50)


def test_zero_or_negative_cost_ignored() -> None:
    spend_cap.record_actual(USER, "pro", 0.0)
    spend_cap.record_actual(USER, "pro", -1.0)
    assert spend_cap.current_spend_usd(USER) == 0.0
