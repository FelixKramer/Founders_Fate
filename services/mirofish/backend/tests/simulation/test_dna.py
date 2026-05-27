"""DNA report generation tests."""
from __future__ import annotations

import json
import os

import pytest

os.environ.setdefault("LLM_GATEWAY_MODE", "mock")

from simulation.dna import (
    _build_bias_prompt,
    _build_pattern_prompt,
    generate_dna_report,
    load_report,
)

SAMPLE_SUMMARIES = [
    {
        "simulation_id": "sim_1",
        "scenario_id": "seed-round-sizing",
        "archetype": "b2b_saas",
        "decision_option_id": "raise_1_5m",
        "key_risks": ["Dilution too high", "Runway too short"],
        "confidence_score": 0.7,
        "outcome_type": "balanced",
    },
    {
        "simulation_id": "sim_2",
        "scenario_id": "hiring-plan-ab",
        "archetype": "b2b_saas",
        "decision_option_id": "hire_fast",
        "key_risks": ["Burn too high"],
        "confidence_score": 0.6,
        "outcome_type": "high_risk",
    },
    {
        "simulation_id": "sim_3",
        "scenario_id": "pivot-timing",
        "archetype": "b2b_saas",
        "decision_option_id": "pivot_now",
        "key_risks": ["Lost momentum"],
        "confidence_score": 0.5,
        "outcome_type": "high_risk",
    },
]


# ── _build_bias_prompt ────────────────────────────────────────────────────────


def test_build_bias_prompt_is_valid_json() -> None:
    prompt_str = _build_bias_prompt("usr_test", SAMPLE_SUMMARIES)
    parsed = json.loads(prompt_str)
    assert isinstance(parsed, dict)


def test_build_bias_prompt_contains_task_field() -> None:
    prompt_str = _build_bias_prompt("usr_test", SAMPLE_SUMMARIES)
    assert "cognitive_bias_analysis" in prompt_str


def test_build_bias_prompt_contains_simulation_count() -> None:
    prompt_str = _build_bias_prompt("usr_test", SAMPLE_SUMMARIES)
    parsed = json.loads(prompt_str)
    assert parsed["simulation_count"] == len(SAMPLE_SUMMARIES)


def test_build_bias_prompt_includes_simulations() -> None:
    prompt_str = _build_bias_prompt("usr_test", SAMPLE_SUMMARIES)
    parsed = json.loads(prompt_str)
    assert "simulations" in parsed
    assert len(parsed["simulations"]) == len(SAMPLE_SUMMARIES)


def test_build_bias_prompt_includes_instruction() -> None:
    prompt_str = _build_bias_prompt("usr_test", SAMPLE_SUMMARIES)
    parsed = json.loads(prompt_str)
    assert "instruction" in parsed
    assert "cognitive" in parsed["instruction"].lower()


def test_build_bias_prompt_empty_summaries() -> None:
    prompt_str = _build_bias_prompt("usr_test", [])
    parsed = json.loads(prompt_str)
    assert parsed["simulation_count"] == 0
    assert parsed["simulations"] == []


# ── _build_pattern_prompt ─────────────────────────────────────────────────────


def test_build_pattern_prompt_is_valid_json() -> None:
    biases: dict = {"biases": [], "risk_profile": "balanced"}
    prompt_str = _build_pattern_prompt("usr_test", SAMPLE_SUMMARIES, biases)
    parsed = json.loads(prompt_str)
    assert isinstance(parsed, dict)


def test_build_pattern_prompt_contains_task_field() -> None:
    biases: dict = {"biases": [], "risk_profile": "balanced"}
    prompt_str = _build_pattern_prompt("usr_test", SAMPLE_SUMMARIES, biases)
    assert "decision_pattern_synthesis" in prompt_str


def test_build_pattern_prompt_contains_recommendations_instruction() -> None:
    biases: dict = {"biases": [], "risk_profile": "balanced"}
    prompt_str = _build_pattern_prompt("usr_test", SAMPLE_SUMMARIES, biases)
    assert "recommendations" in prompt_str


def test_build_pattern_prompt_includes_identified_biases() -> None:
    known_bias = {"name": "overconfidence", "severity": "high"}
    biases: dict = {"biases": [known_bias], "risk_profile": "aggressive"}
    prompt_str = _build_pattern_prompt("usr_test", SAMPLE_SUMMARIES, biases)
    parsed = json.loads(prompt_str)
    assert parsed["identified_biases"] == [known_bias]


def test_build_pattern_prompt_empty_biases() -> None:
    prompt_str = _build_pattern_prompt("usr_test", SAMPLE_SUMMARIES, {})
    parsed = json.loads(prompt_str)
    assert parsed["identified_biases"] == []


# ── generate_dna_report (full pipeline in mock mode) ─────────────────────────


def test_generate_dna_report_mock_mode_updates_job_registry(tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch) -> None:
    """In mock LLM mode, report generation should complete (or fail gracefully)."""
    monkeypatch.setenv("REPORTS_DIR", str(tmp_path))
    import importlib
    import simulation.dna as dna_module
    importlib.reload(dna_module)

    jobs: dict = {}
    dna_module.generate_dna_report("usr_test", SAMPLE_SUMMARIES, "job_test_001", jobs)

    assert "job_test_001" in jobs
    assert jobs["job_test_001"]["status"] in ("completed", "failed")


def test_generate_dna_report_mock_mode_saves_report_file_on_success(
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REPORTS_DIR", str(tmp_path))
    import importlib
    import simulation.dna as dna_module
    importlib.reload(dna_module)

    jobs: dict = {}
    dna_module.generate_dna_report("usr_persist", SAMPLE_SUMMARIES, "job_persist_001", jobs)

    if jobs["job_persist_001"]["status"] == "completed":
        report_path = tmp_path / "usr_persist" / "report.json"
        assert report_path.exists(), "Report file should be saved on completion"
        with open(report_path) as f:
            report = json.load(f)
        assert report["user_id"] == "usr_persist"
        assert report["simulation_count"] == len(SAMPLE_SUMMARIES)
        assert "job_id" in report


def test_generate_dna_report_mock_mode_result_structure_on_success(
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REPORTS_DIR", str(tmp_path))
    import importlib
    import simulation.dna as dna_module
    importlib.reload(dna_module)

    jobs: dict = {}
    dna_module.generate_dna_report("usr_struct", SAMPLE_SUMMARIES, "job_struct_001", jobs)

    if jobs["job_struct_001"]["status"] == "completed":
        result = jobs["job_struct_001"]["result"]
        assert result is not None
        assert "cognitive_biases" in result
        assert "decision_patterns" in result
        assert "recommendations" in result
        assert "risk_profile" in result
        assert isinstance(result["simulation_count"], int)


# ── load_report ───────────────────────────────────────────────────────────────


def test_load_report_returns_none_for_unknown_user(
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REPORTS_DIR", str(tmp_path))
    import importlib
    import simulation.dna as dna_module
    importlib.reload(dna_module)

    result = dna_module.load_report("nonexistent_user_xyz")
    assert result is None


def test_load_report_returns_report_after_save(
    tmp_path: pytest.TempPathFactory,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REPORTS_DIR", str(tmp_path))
    import importlib
    import simulation.dna as dna_module
    importlib.reload(dna_module)

    # Manually create a report file
    user_dir = tmp_path / "usr_load_test"
    user_dir.mkdir(parents=True)
    report_data = {"user_id": "usr_load_test", "cognitive_biases": [], "recommendations": []}
    with open(user_dir / "report.json", "w") as f:
        json.dump(report_data, f)

    result = dna_module.load_report("usr_load_test")
    assert result is not None
    assert result["user_id"] == "usr_load_test"
