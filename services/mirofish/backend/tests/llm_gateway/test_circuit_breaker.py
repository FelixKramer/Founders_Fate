"""Circuit breaker tests using the same FakeRedis stub."""

from __future__ import annotations

import pytest

from llm_gateway import circuit_breaker as breaker
from llm_gateway import redis_client
from tests.llm_gateway.test_cache import FakeRedis  # reuse fixture


@pytest.fixture(autouse=True)
def _fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(redis_client, "_client", fake)
    yield fake
    redis_client.reset_for_tests()


MODEL = "test/model"


def test_starts_closed() -> None:
    assert breaker.is_open(MODEL) is False


def test_below_min_samples_does_not_trip() -> None:
    for _ in range(breaker.MIN_SAMPLES - 1):
        breaker.record_failure(MODEL, "rate_limit")
    assert breaker.is_open(MODEL) is False


def test_above_threshold_trips() -> None:
    # 1 success + 9 failures = 90% error rate over 10 samples (>20% threshold).
    breaker.record_success(MODEL)
    for _ in range(breaker.MIN_SAMPLES):
        breaker.record_failure(MODEL, "rate_limit")
    assert breaker.is_open(MODEL) is True


def test_force_reset_clears_open(_fake_redis: FakeRedis) -> None:
    for _ in range(breaker.MIN_SAMPLES):
        breaker.record_failure(MODEL, "rate_limit")
    assert breaker.is_open(MODEL) is True
    breaker.force_reset_for_tests(MODEL)
    assert breaker.is_open(MODEL) is False


def test_open_signal_set_with_ttl(_fake_redis: FakeRedis) -> None:
    for _ in range(breaker.MIN_SAMPLES):
        breaker.record_failure(MODEL, "rate_limit")
    open_key = f"ff:cb:open:{MODEL}"
    assert open_key in _fake_redis.store
    assert _fake_redis.ttls[open_key] == breaker.OPEN_DURATION_SECONDS
