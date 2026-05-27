"""Zep wrapper fallback tests (no ZEP_API_KEY set → in-process dict storage)."""
from __future__ import annotations

import os

import pytest

# Ensure ZEP_API_KEY is NOT set so we always test the in-memory fallback
os.environ.pop("ZEP_API_KEY", None)

from simulation.zep_wrapper import ZepWrapper


def test_zep_wrapper_add_and_get_single_memory() -> None:
    """Wrapper stores a message and retrieves it."""
    w = ZepWrapper("session_test_single_001")
    w.add_memory("user", "Hello, I'm building a B2B SaaS")
    memories = w.get_memory(last_n=10)
    assert len(memories) == 1
    assert memories[0]["role"] == "user"
    assert "B2B SaaS" in memories[0]["content"]


def test_zep_wrapper_stores_multiple_messages() -> None:
    w = ZepWrapper("session_test_multi_002")
    w.add_memory("user", "Hello, I'm building a B2B SaaS")
    w.add_memory("assistant", "Tell me about your ARR")
    memories = w.get_memory(last_n=10)
    assert len(memories) == 2
    assert memories[0]["role"] == "user"
    assert memories[1]["role"] == "assistant"


def test_zep_wrapper_get_last_n_slices_correctly() -> None:
    w = ZepWrapper("session_test_lastn_003")
    for i in range(5):
        w.add_memory("user", f"message {i}")
    memories = w.get_memory(last_n=3)
    assert len(memories) == 3
    assert "message 4" in memories[-1]["content"]
    assert "message 3" in memories[-2]["content"]
    assert "message 2" in memories[-3]["content"]


def test_zep_wrapper_get_last_n_returns_all_if_fewer_than_n() -> None:
    w = ZepWrapper("session_test_fewer_004")
    w.add_memory("user", "only message")
    memories = w.get_memory(last_n=10)
    assert len(memories) == 1


def test_zep_wrapper_different_sessions_are_isolated() -> None:
    w1 = ZepWrapper("session_iso_a_005")
    w2 = ZepWrapper("session_iso_b_005")
    w1.add_memory("user", "session A message")
    w2.add_memory("user", "session B message")

    mem1 = w1.get_memory(last_n=10)
    mem2 = w2.get_memory(last_n=10)

    assert len(mem1) == 1
    assert len(mem2) == 1
    assert "session A" in mem1[0]["content"]
    assert "session B" in mem2[0]["content"]


def test_zep_wrapper_metadata_stored() -> None:
    w = ZepWrapper("session_meta_006")
    w.add_memory("user", "with metadata", metadata={"stage": "cascade", "turn": 1})
    memories = w.get_memory(last_n=10)
    assert len(memories) == 1
    assert memories[0]["metadata"]["stage"] == "cascade"
    assert memories[0]["metadata"]["turn"] == 1


def test_zep_wrapper_empty_session_returns_empty_list() -> None:
    w = ZepWrapper("session_empty_007")
    memories = w.get_memory(last_n=10)
    assert memories == []


def test_zep_wrapper_get_last_n_zero_returns_empty() -> None:
    w = ZepWrapper("session_zero_008")
    w.add_memory("user", "some message")
    memories = w.get_memory(last_n=0)
    assert memories == []


def test_zep_wrapper_preserves_insertion_order() -> None:
    w = ZepWrapper("session_order_009")
    roles = ["user", "assistant", "user", "assistant"]
    for i, role in enumerate(roles):
        w.add_memory(role, f"turn {i}")
    memories = w.get_memory(last_n=10)
    for i, mem in enumerate(memories):
        assert mem["role"] == roles[i]
        assert f"turn {i}" in mem["content"]


def test_zep_wrapper_metadata_defaults_to_empty_dict() -> None:
    w = ZepWrapper("session_meta_default_010")
    w.add_memory("user", "no metadata")
    memories = w.get_memory(last_n=10)
    assert memories[0]["metadata"] == {}
