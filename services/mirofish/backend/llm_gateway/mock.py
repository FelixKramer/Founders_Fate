"""Deterministic mock LLM for local development and tests.

Activated by ``LLM_GATEWAY_MODE=mock``. Returns deterministic text and
JSON keyed by the request hash so test fixtures stay stable.

The mock honours the same stage-based routing config so call sites
can't accidentally diverge from production behaviour — only the
network round-trip is skipped.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def deterministic_completion(messages: list[dict[str, str]], stage: str) -> str:
    """Return a deterministic completion that includes a marker for the stage
    and a hash of the input. Useful for tests asserting specific stages were
    invoked without caring about the model's wording."""
    digest = hashlib.sha256(
        (stage + "\n" + json.dumps(messages, sort_keys=True)).encode("utf-8")
    ).hexdigest()[:12]
    return (
        f"[MOCK:{stage}:{digest}] Deterministic mock response. "
        "Switch LLM_GATEWAY_MODE=live + set OPENROUTER_API_KEY for real calls."
    )


def deterministic_json(messages: list[dict[str, str]], stage: str) -> dict[str, Any]:
    """Return a deterministic JSON object that mirrors the shape callers expect."""
    digest = hashlib.sha256(
        (stage + "\n" + json.dumps(messages, sort_keys=True)).encode("utf-8")
    ).hexdigest()[:12]
    # The shape below is intentionally generic — specific callers should
    # override via stage-specific mock fixtures (planned in M4.5.11).
    return {
        "mock": True,
        "stage": stage,
        "digest": digest,
        "summary": deterministic_completion(messages, stage),
    }
