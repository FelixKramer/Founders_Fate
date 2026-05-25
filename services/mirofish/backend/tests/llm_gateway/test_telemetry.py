"""Telemetry queue shape tests. The worker thread is disabled in tests
via telemetry.reset_for_tests() so we can assert what would have been
POSTed without needing a Next.js endpoint."""

from __future__ import annotations

import pytest

from llm_gateway import telemetry


@pytest.fixture(autouse=True)
def _reset() -> None:
    telemetry.reset_for_tests()
    yield
    telemetry.reset_for_tests()


def test_emit_queues_expected_shape() -> None:
    telemetry.emit(
        stage="ontology_gen",
        model="openai/gpt-4o-mini",
        tier="M",
        provider="openrouter",
        user_id="usr_abc",
        simulation_id="sim_xyz",
        input_tokens=100,
        output_tokens=42,
        cost_usd=0.00345,
        latency_ms=820,
        cache_hit=False,
        attempt=1,
        error_category=None,
    )
    events = telemetry.drain_for_tests()
    assert len(events) == 1
    e = events[0]
    assert e["stage"] == "ontology_gen"
    assert e["model"] == "openai/gpt-4o-mini"
    assert e["tier"] == "M"
    assert e["provider"] == "openrouter"
    assert e["user_id"] == "usr_abc"
    assert e["simulation_id"] == "sim_xyz"
    assert e["input_tokens"] == 100
    assert e["output_tokens"] == 42
    assert e["cost_usd"] == pytest.approx(0.00345)
    assert e["latency_ms"] == 820
    assert e["cache_hit"] is False
    assert e["attempt"] == 1
    assert e["error_category"] is None


def test_emit_handles_anonymous_calls() -> None:
    telemetry.emit(
        stage="dna_synthesis",
        model="anthropic/claude-3-opus",
        tier="L",
        provider="openrouter",
        user_id=None,
        simulation_id=None,
        input_tokens=10,
        output_tokens=20,
        cost_usd=0.0,
        latency_ms=100,
        cache_hit=False,
        attempt=1,
        error_category=None,
    )
    events = telemetry.drain_for_tests()
    assert events[0]["user_id"] is None
    assert events[0]["simulation_id"] is None


def test_emit_cost_rounded_to_6_decimals() -> None:
    telemetry.emit(
        stage="cascade_step",
        model="m",
        tier="S",
        provider="openrouter",
        user_id="usr",
        simulation_id="sim",
        input_tokens=1,
        output_tokens=1,
        cost_usd=0.000_123_456_789,
        latency_ms=10,
        cache_hit=False,
        attempt=1,
        error_category=None,
    )
    events = telemetry.drain_for_tests()
    # Spec says round to 6 decimals.
    assert events[0]["cost_usd"] == pytest.approx(0.000123)
