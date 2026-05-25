"""Cache layer tests using an in-process FakeRedis so we don't need a
running Redis service."""

from __future__ import annotations

import json

import pytest

from llm_gateway import cache as response_cache
from llm_gateway import redis_client
from llm_gateway.stages import STAGE_CACHE_TTL, Stage


class FakeRedis:
    """Minimal in-memory Redis stub. Honours `ex` (TTL) by recording it
    but not actually expiring — fine for tests."""

    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.ttls: dict[str, int] = {}

    def get(self, key: str) -> str | None:
        return self.store.get(key)

    def set(self, key: str, value: str, ex: int | None = None, nx: bool | None = None) -> None:
        if nx and key in self.store:
            return
        self.store[key] = value
        if ex is not None:
            self.ttls[key] = ex

    def incrbyfloat(self, key: str, amount: float) -> float:
        cur = float(self.store.get(key, "0"))
        cur += amount
        self.store[key] = str(cur)
        return cur

    def incr(self, key: str) -> int:
        cur = int(self.store.get(key, "0"))
        cur += 1
        self.store[key] = str(cur)
        return cur

    def expire(self, key: str, seconds: int) -> None:
        self.ttls[key] = seconds

    def delete(self, key: str) -> None:
        self.store.pop(key, None)
        self.ttls.pop(key, None)

    def ping(self) -> bool:
        return True


@pytest.fixture(autouse=True)
def _fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(redis_client, "_client", fake)
    yield fake
    redis_client.reset_for_tests()


MSGS = [
    {"role": "system", "content": "system"},
    {"role": "user", "content": "Hi"},
]


def test_put_then_get_round_trip(_fake_redis: FakeRedis) -> None:
    response_cache.put(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
        text="hello world", input_tokens=12, output_tokens=3,
    )
    hit = response_cache.get(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
    )
    assert hit is not None
    assert hit.text == "hello world"
    assert hit.input_tokens == 12
    assert hit.output_tokens == 3
    assert hit.model == "m1"


def test_temperature_bucketing(_fake_redis: FakeRedis) -> None:
    response_cache.put(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.71, max_tokens=1024,
        text="a", input_tokens=0, output_tokens=0,
    )
    # 0.71 buckets to 0.7; 0.74 also buckets to 0.7 -> hit
    assert response_cache.get(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.74, max_tokens=1024,
    ) is not None
    # 0.65 buckets to 0.7 too (round-half-even), but 0.55 buckets to 0.5 -> miss
    assert response_cache.get(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.55, max_tokens=1024,
    ) is None


def test_stage_with_zero_ttl_does_not_cache(_fake_redis: FakeRedis) -> None:
    assert STAGE_CACHE_TTL[Stage.CASCADE_STEP] == 0
    response_cache.put(
        stage=Stage.CASCADE_STEP, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
        text="never cached", input_tokens=0, output_tokens=0,
    )
    assert _fake_redis.store == {}


def test_model_in_key_invalidates_on_swap(_fake_redis: FakeRedis) -> None:
    response_cache.put(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
        text="m1 result", input_tokens=0, output_tokens=0,
    )
    # Same inputs, different model -> miss.
    assert response_cache.get(
        stage=Stage.ONTOLOGY_GEN, model="m2", messages=MSGS,
        temperature=0.5, max_tokens=1024,
    ) is None


def test_malformed_value_treated_as_miss(_fake_redis: FakeRedis) -> None:
    key = response_cache.cache_key(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
    )
    _fake_redis.store[key] = "{not valid json"
    assert response_cache.get(
        stage=Stage.ONTOLOGY_GEN, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
    ) is None


def test_ttl_set_to_stage_value(_fake_redis: FakeRedis) -> None:
    response_cache.put(
        stage=Stage.AGENT_PERSONA, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
        text="x", input_tokens=0, output_tokens=0,
    )
    key = response_cache.cache_key(
        stage=Stage.AGENT_PERSONA, model="m1", messages=MSGS,
        temperature=0.5, max_tokens=1024,
    )
    assert _fake_redis.ttls[key] == STAGE_CACHE_TTL[Stage.AGENT_PERSONA]
