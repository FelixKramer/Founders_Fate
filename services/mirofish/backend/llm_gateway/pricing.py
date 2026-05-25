"""Per-model token pricing in USD per million tokens.

Source of truth: OpenRouter's published rates. Updated manually for
now; M4.5.9 will reconcile against the OpenRouter billing API weekly.

Models not in this table fall through to a conservative default ($10/1M
in, $30/1M out) so unknown providers can't silently appear free in the
cost dashboard.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelPrice:
    input_per_million: float
    output_per_million: float


# Effective late-2026 OpenRouter list prices for the models we actually
# route to. Update from https://openrouter.ai/models when a contract
# negotiation or provider rate change makes the spread move.
PRICES: dict[str, ModelPrice] = {
    # Tier S
    "deepseek/deepseek-chat":           ModelPrice(0.27,  1.10),
    "qwen/qwen-2.5-72b-instruct":       ModelPrice(0.35,  0.40),
    "openai/gpt-4o-mini":               ModelPrice(0.15,  0.60),
    # Tier M
    "anthropic/claude-3-5-haiku":       ModelPrice(1.00,  5.00),
    # Tier L
    "anthropic/claude-3-opus":          ModelPrice(15.00, 75.00),
    "anthropic/claude-3-5-sonnet":      ModelPrice(3.00,  15.00),
    "openai/gpt-4o":                    ModelPrice(2.50,  10.00),
}

# Conservative default — chosen high so a missing entry is visible in
# the cost dashboard rather than under-counted.
DEFAULT_PRICE = ModelPrice(10.00, 30.00)


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    p = PRICES.get(model, DEFAULT_PRICE)
    return (input_tokens / 1_000_000) * p.input_per_million + (
        output_tokens / 1_000_000
    ) * p.output_per_million
