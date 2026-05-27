"""OASIS multi-agent simulation runner.

Wraps camel-oasis agent-vs-agent interactions. Currently a structured stub
that returns deterministic outputs based on the seed. Full OASIS integration
is M5.8+ (tracked separately). The pipeline uses LLM cascade steps instead
for now — this module will be wired in once OASIS environment setup is stable.
"""
from __future__ import annotations

import hashlib
import logging
from typing import Any

logger = logging.getLogger(__name__)


def run_oasis_episode(
    agents: list[dict[str, Any]],
    scenario_context: dict[str, Any],
    seed: str,
    max_turns: int = 20,
) -> dict[str, Any]:
    """Run one OASIS episode.

    Returns interaction transcript and emergent outcomes.
    Currently returns a stub based on seed hash for reproducibility.
    """
    # Stub: deterministic output based on seed
    seed_hash = hashlib.sha256(seed.encode()).hexdigest()
    seed_int = int(seed_hash[:8], 16)

    logger.info(
        "oasis_runner: stub mode (seed=%s, agents=%d, turns=%d)",
        seed[:8],
        len(agents),
        max_turns,
    )

    return {
        "transcript": [
            {
                "turn": i + 1,
                "agent_id": agents[i % len(agents)].get("id", f"agent_{i}") if agents else f"agent_{i}",
                "message": f"[OASIS stub turn {i + 1}]",
            }
            for i in range(min(max_turns, 5))  # stub: 5 turns
        ],
        "emergent_outcomes": [
            "Agents reached consensus on cost-cutting measures",
            "Investor confidence declined after milestone miss",
        ],
        "convergence_turn": (seed_int % max_turns) + 1,
        "stub": True,
    }
