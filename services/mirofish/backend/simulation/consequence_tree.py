"""Consequence tree data structures and builder."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ConsequenceNode:
    id: str
    label: str
    type: str  # "risk" | "opportunity" | "neutral"
    probability: float  # 0–1
    impact_score: float  # 0–1, higher = more impactful
    severity: float = 0.5
    likelihood: float = 0.5
    reversibility: float = 0.5
    parent_id: str | None = None
    children: list["ConsequenceNode"] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type,
            "probability": self.probability,
            "impact_score": self.impact_score,
            "severity": self.severity,
            "likelihood": self.likelihood,
            "reversibility": self.reversibility,
            "parent_id": self.parent_id,
            "children": [c.to_dict() for c in self.children],
            "metadata": self.metadata,
        }


@dataclass
class ConsequenceTree:
    root: ConsequenceNode
    total_nodes: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "root": self.root.to_dict(),
            "total_nodes": self.total_nodes,
        }


def build_consequence_tree(
    cascade_history: list[dict[str, Any]],
    scored: dict[str, Any],
) -> ConsequenceTree:
    """Build a ConsequenceTree from cascade step outputs and scoring results."""
    # Index scored nodes
    score_index: dict[str, dict[str, Any]] = {}
    for node in scored.get("scored_nodes", []):
        nid = node.get("id")
        if nid:
            score_index[nid] = node

    # Collect all nodes across cascade steps
    all_raw_nodes: list[dict[str, Any]] = []
    for step in cascade_history:
        all_raw_nodes.extend(step.get("nodes", []))

    if not all_raw_nodes:
        # Return minimal tree if pipeline produced no nodes
        root = ConsequenceNode(
            id="root",
            label="Decision Made",
            type="neutral",
            probability=1.0,
            impact_score=0.5,
        )
        return ConsequenceTree(root=root, total_nodes=1)

    # Build node map
    node_map: dict[str, ConsequenceNode] = {}
    for raw in all_raw_nodes:
        nid = raw.get("id", "")
        scores = score_index.get(nid, {})
        node_map[nid] = ConsequenceNode(
            id=nid,
            label=raw.get("label", ""),
            type=raw.get("type", "neutral"),
            probability=float(raw.get("probability", 0.5)),
            impact_score=float(raw.get("impact_score", 0.5)),
            severity=float(scores.get("severity", 0.5)),
            likelihood=float(scores.get("likelihood", 0.5)),
            reversibility=float(scores.get("reversibility", 0.5)),
            parent_id=raw.get("parent_id"),
        )

    # Wire up parent→child relationships
    roots: list[ConsequenceNode] = []
    for node in node_map.values():
        if node.parent_id and node.parent_id in node_map:
            node_map[node.parent_id].children.append(node)
        elif not node.parent_id:
            roots.append(node)

    # If multiple roots, create a synthetic root
    if len(roots) == 1:
        root = roots[0]
    elif roots:
        root = ConsequenceNode(
            id="synthetic_root",
            label="Decision Made",
            type="neutral",
            probability=1.0,
            impact_score=0.5,
            children=roots,
        )
    else:
        # All nodes have parents but none matched — pick first as root
        root = next(iter(node_map.values()))

    return ConsequenceTree(root=root, total_nodes=len(node_map))
