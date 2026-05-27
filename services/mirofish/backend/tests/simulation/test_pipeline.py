"""Pipeline smoke tests using mock LLM mode."""
from __future__ import annotations

import os

import pytest

os.environ.setdefault("LLM_GATEWAY_MODE", "mock")

from simulation.consequence_tree import build_consequence_tree
from simulation.pipeline import SimulationRequest, run_pipeline
from simulation.seed import derive_seed


def test_derive_seed_deterministic() -> None:
    s1 = derive_seed("sim_abc", "usr_xyz")
    s2 = derive_seed("sim_abc", "usr_xyz")
    assert s1 == s2
    assert len(s1) == 64  # hex sha256


def test_derive_seed_differs_by_user() -> None:
    s1 = derive_seed("sim_abc", "usr_1")
    s2 = derive_seed("sim_abc", "usr_2")
    assert s1 != s2


def test_build_consequence_tree_empty_cascade() -> None:
    tree = build_consequence_tree([], {})
    assert tree.root is not None
    assert tree.root.id == "root"


def test_build_consequence_tree_with_nodes() -> None:
    cascade = [
        {
            "nodes": [
                {
                    "id": "n1",
                    "label": "Revenue drops",
                    "type": "risk",
                    "probability": 0.7,
                    "impact_score": 0.8,
                    "parent_id": None,
                },
                {
                    "id": "n2",
                    "label": "Key hire leaves",
                    "type": "risk",
                    "probability": 0.4,
                    "impact_score": 0.6,
                    "parent_id": "n1",
                },
            ]
        }
    ]
    scored = {
        "scored_nodes": [
            {"id": "n1", "severity": 0.8, "likelihood": 0.7, "reversibility": 0.3},
            {"id": "n2", "severity": 0.6, "likelihood": 0.4, "reversibility": 0.5},
        ],
        "overall_confidence": 0.65,
    }
    tree = build_consequence_tree(cascade, scored)
    assert tree.total_nodes == 2
    assert tree.root.id == "n1"
    assert len(tree.root.children) == 1
    assert tree.root.children[0].id == "n2"


def test_pipeline_smoke_mock() -> None:
    """End-to-end smoke test in mock mode."""
    req = SimulationRequest(
        simulation_id="test_sim_001",
        user_id="usr_test",
        user_tier="pro",
        scenario_id="seed-round-sizing",
        archetype="b2b_saas",
        decision_option_id="raise_1_5m",
        parameters={"runway_months": 18, "burn_rate_monthly": 50000},
        seed=derive_seed("test_sim_001", "usr_test"),
    )
    results = run_pipeline(req)
    assert results["simulation_id"] == "test_sim_001"
    assert "consequence_tree" in results
    assert "narrative" in results
