"""Verify that LLM_GATEWAY_MODE=mock produces deterministic completions
without touching the network. This is the path local dev + CI runs in."""

from __future__ import annotations

import os

import pytest

from llm_gateway import Stage, complete, complete_json


@pytest.fixture(autouse=True)
def _force_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_GATEWAY_MODE", "mock")
    # Make sure no real OpenRouter call could happen even by accident.
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)


def test_complete_returns_deterministic_text() -> None:
    messages = [{"role": "user", "content": "hello"}]
    a = complete(stage=Stage.ONTOLOGY_GEN, messages=messages)
    b = complete(stage=Stage.ONTOLOGY_GEN, messages=messages)
    assert a == b
    assert "MOCK:ontology_gen" in a


def test_complete_distinct_per_stage() -> None:
    msgs = [{"role": "user", "content": "x"}]
    assert complete(stage=Stage.AGENT_PERSONA, messages=msgs) != complete(
        stage=Stage.CASCADE_STEP, messages=msgs
    )


def test_complete_json_returns_dict() -> None:
    obj = complete_json(stage=Stage.DNA_SYNTHESIS, messages=[{"role": "user", "content": "x"}])
    assert isinstance(obj, dict)
    assert obj["mock"] is True
    assert obj["stage"] == "dna_synthesis"
