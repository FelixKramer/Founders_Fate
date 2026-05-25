"""Smoke tests for the routing config loader. These run without network
or LLM access — they only validate that the bundled YAML parses cleanly
and that the resolver returns sensible tiers for every Stage."""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from llm_gateway.errors import ConfigError
from llm_gateway.routing import RoutingConfigStore
from llm_gateway.stages import Stage


REPO_CONFIG = Path(__file__).resolve().parents[3] / "config" / "llm-routing.yaml"


def test_bundled_config_parses_and_covers_every_stage() -> None:
    store = RoutingConfigStore(REPO_CONFIG)
    cfg = store.get()

    # Every Stage has a tier mapping.
    for stage in Stage:
        tier, _overrides = cfg.resolve(stage)
        assert tier.tier in {"S", "M", "L"}, stage
        assert tier.primary, f"stage {stage} resolved to empty primary"
        assert tier.max_tokens > 0


def test_missing_stage_mapping_rejected(tmp_path: Path) -> None:
    bad = tmp_path / "routing.yaml"
    bad.write_text(
        textwrap.dedent(
            """
            version: 1
            tiers:
              S: {primary: a, fallbacks: [b], temperature: 0.5, max_tokens: 1024}
              M: {primary: c, fallbacks: [], temperature: 0.4, max_tokens: 2048}
              L: {primary: d, fallbacks: [], temperature: 0.3, max_tokens: 4096}
            stage_tier:
              ontology_gen: M
              # all other stages intentionally omitted
            """
        ),
        encoding="utf-8",
    )
    with pytest.raises(ConfigError, match="stage_tier is missing"):
        RoutingConfigStore(bad)


def test_unknown_stage_rejected(tmp_path: Path) -> None:
    bad = tmp_path / "routing.yaml"
    bad.write_text(
        textwrap.dedent(
            """
            version: 1
            tiers:
              S: {primary: a, fallbacks: [], temperature: 0.5, max_tokens: 1024}
              M: {primary: b, fallbacks: [], temperature: 0.4, max_tokens: 2048}
              L: {primary: c, fallbacks: [], temperature: 0.3, max_tokens: 4096}
            stage_tier:
              ontology_gen: M
              agent_persona: S
              cascade_step: S
              node_narrative: M
              dna_synthesis: L
              premortem_iter: S
              premortem_synth: L
              custom_model_ontology: M
              not_a_real_stage: S
            """
        ),
        encoding="utf-8",
    )
    with pytest.raises(ConfigError, match="unknown stage"):
        RoutingConfigStore(bad)


def test_tier_referenced_by_stage_must_exist(tmp_path: Path) -> None:
    bad = tmp_path / "routing.yaml"
    bad.write_text(
        textwrap.dedent(
            """
            version: 1
            tiers:
              S: {primary: a, fallbacks: [], temperature: 0.5, max_tokens: 1024}
              M: {primary: b, fallbacks: [], temperature: 0.4, max_tokens: 2048}
              L: {primary: c, fallbacks: [], temperature: 0.3, max_tokens: 4096}
            stage_tier:
              ontology_gen: XL   # bogus tier
              agent_persona: S
              cascade_step: S
              node_narrative: M
              dna_synthesis: L
              premortem_iter: S
              premortem_synth: L
              custom_model_ontology: M
            """
        ),
        encoding="utf-8",
    )
    with pytest.raises(ConfigError, match="unknown tier"):
        RoutingConfigStore(bad)
