"""Utility for calibrating and normalising consequence tree probabilities.

Ensures:
1. Child probabilities are ≤ parent probability (except recovery paths).
2. Sibling probabilities at each depth sum to ≤ 1.0 (mutually exclusive paths).
3. No probability is exactly 0.0 or 1.0 (clip to [0.01, 0.99]).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CalibrationResult:
    tree: dict[str, Any]
    adjustments_made: int
    warnings: list[str] = field(default_factory=list)


def calibrate_tree(tree: dict[str, Any], parent_probability: float = 1.0) -> CalibrationResult:
    """Recursively calibrate a consequence tree node and its children.

    Args:
        tree: A consequence node dict (must have 'probability' key).
        parent_probability: The probability of the parent node (1.0 for root).

    Returns:
        CalibrationResult with the calibrated tree, count of adjustments made,
        and human-readable warnings for each adjustment.
    """
    adjustments = 0
    warnings: list[str] = []

    node = dict(tree)
    prob = float(node.get("probability", 0.5))

    # Rule 3: Clip to valid range — no exact 0 or 1.
    if prob <= 0.0 or prob >= 1.0:
        clipped = max(0.01, min(0.99, prob))
        warnings.append(
            f"Node '{node.get('id', '?')}' probability {prob} clipped to {clipped}"
        )
        prob = clipped
        adjustments += 1

    # Rule 1: Child probability cannot exceed parent (except explicit recovery paths).
    # Allow 5% tolerance for floating-point rounding from LLM output.
    is_recovery = node.get("is_recovery_path", False)
    if not is_recovery and prob > parent_probability * 1.05:
        adjusted = parent_probability * 0.95
        warnings.append(
            f"Node '{node.get('id', '?')}' probability {prob:.3f} reduced to {adjusted:.3f} "
            f"(parent={parent_probability:.3f})"
        )
        prob = adjusted
        adjustments += 1

    node["probability"] = round(prob, 3)

    # Calibrate children recursively.
    children = node.get("children", [])
    if children:
        calibrated_children: list[dict[str, Any]] = []
        child_results = [calibrate_tree(c, prob) for c in children]
        for cr in child_results:
            calibrated_children.append(cr.tree)
            adjustments += cr.adjustments_made
            warnings.extend(cr.warnings)

        # Rule 2: Sibling probabilities must sum to ≤ 1.0 (mutually exclusive paths).
        # Allow 5% tolerance before normalising.
        sibling_sum = sum(c["probability"] for c in calibrated_children)
        if sibling_sum > 1.0 + 0.05:
            scale = 1.0 / sibling_sum
            for c in calibrated_children:
                c["probability"] = round(c["probability"] * scale, 3)
            warnings.append(
                f"Siblings under '{node.get('id', '?')}' summed to {sibling_sum:.3f} — normalised"
            )
            adjustments += 1

        node["children"] = calibrated_children

    return CalibrationResult(tree=node, adjustments_made=adjustments, warnings=warnings)


def calibrate_simulation_result(result: dict[str, Any]) -> dict[str, Any]:
    """Apply probability calibration to a full simulation result dict.

    The simulation result is expected to have a 'consequence_tree' key containing
    a dict with a 'root' node. If absent, the result is returned unchanged.

    Adds a '_calibration' key with adjustment stats to the result (does not
    modify any other fields).

    Args:
        result: The full simulation result dict from run_pipeline().

    Returns:
        A new dict (shallow copy) with calibrated consequence_tree and
        '_calibration' metadata.
    """
    tree_wrapper = result.get("consequence_tree")
    if not tree_wrapper:
        return result

    # consequence_tree is { root: {...}, total_nodes: int }
    root = tree_wrapper.get("root") if isinstance(tree_wrapper, dict) else None
    if not root:
        return result

    cr = calibrate_tree(root)

    result = dict(result)
    result["consequence_tree"] = dict(tree_wrapper)
    result["consequence_tree"]["root"] = cr.tree

    result["_calibration"] = {
        "adjustments": cr.adjustments_made,
        # Cap warnings to avoid bloating the stored result.
        "warnings": cr.warnings[:20],
    }
    return result
