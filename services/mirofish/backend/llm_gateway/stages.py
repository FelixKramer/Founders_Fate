"""Stages of the simulation pipeline. Every LLM call must declare its stage.

Names are stable and referenced by `config/llm-routing.yaml` and by the
admin LLM-cost dashboard. Renaming is a breaking change.
"""

from __future__ import annotations

from enum import Enum


class Stage(str, Enum):
    """Pipeline stages from PRD §6.5."""

    ONTOLOGY_GEN = "ontology_gen"
    AGENT_PERSONA = "agent_persona"
    CASCADE_STEP = "cascade_step"
    NODE_NARRATIVE = "node_narrative"
    DNA_SYNTHESIS = "dna_synthesis"
    PREMORTEM_ITER = "premortem_iter"
    PREMORTEM_SYNTH = "premortem_synth"
    CUSTOM_MODEL_ONTOLOGY = "custom_model_ontology"

    @classmethod
    def values(cls) -> set[str]:
        return {s.value for s in cls}


# Per-stage cache TTL in seconds. Mirrors PRD §6.5 caching table.
STAGE_CACHE_TTL: dict[Stage, int] = {
    Stage.ONTOLOGY_GEN: 30 * 24 * 3600,         # 30 days
    Stage.AGENT_PERSONA: 365 * 24 * 3600,       # 1 year
    Stage.NODE_NARRATIVE: 90 * 24 * 3600,       # 90 days
    Stage.CUSTOM_MODEL_ONTOLOGY: 30 * 24 * 3600,
    # Cascade / DNA / premortem are highly contextual — don't cache by default.
    Stage.CASCADE_STEP: 0,
    Stage.DNA_SYNTHESIS: 0,
    Stage.PREMORTEM_ITER: 0,
    Stage.PREMORTEM_SYNTH: 0,
}
