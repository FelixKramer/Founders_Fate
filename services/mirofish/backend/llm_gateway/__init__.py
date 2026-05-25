"""Founder Fate LLM gateway.

All LLM traffic in MiroFish flows through this package. Direct imports of
`openai`, `anthropic`, or any provider SDK outside this package are
forbidden — CI enforces it (services/mirofish/.github/.. and
.github/workflows/mirofish.yml).

The single public entry point is :func:`complete`. Stage tagging is
mandatory; the routing config decides which model serves the stage.

Typical use::

    from llm_gateway import complete, Stage

    response = complete(
        stage=Stage.ONTOLOGY_GEN,
        messages=[{"role": "system", "content": ...}, ...],
        user_id="usr_abc",
        simulation_id="sim_def",
    )
"""

from .client import complete, complete_json
from .stages import Stage
from .errors import (
    GatewayError,
    SpendCapExceeded,
    AllProvidersFailed,
    ConfigError,
)

__all__ = [
    "complete",
    "complete_json",
    "Stage",
    "GatewayError",
    "SpendCapExceeded",
    "AllProvidersFailed",
    "ConfigError",
]
