export interface ConsequenceNode {
  id: string;
  label: string;
  type: "risk" | "opportunity" | "neutral";
  probability: number; // 0–1
  impact_score: number; // 0–1
  severity: number; // 0–1
  likelihood: number; // 0–1
  reversibility: number; // 0–1 (1 = easily reversible)
  parent_id: string | null;
  children: ConsequenceNode[];
  metadata: Record<string, unknown>;
  /** Scoring confidence — how certain the model is about this node's score (0–1). */
  confidence?: number;
  /** 10th-percentile (pessimistic) score estimate — present when scoring produced uncertainty bands. */
  lower_bound?: number;
  /** 90th-percentile (optimistic) score estimate — present when scoring produced uncertainty bands. */
  upper_bound?: number;
  /** True if this is an explicit recovery/upside path where probability may exceed parent. */
  is_recovery_path?: boolean;
}

export interface ConsequenceTree {
  root: ConsequenceNode;
  total_nodes: number;
}

export interface SimulationResults {
  simulation_id: string;
  scenario_id: string;
  archetype: string;
  decision_option_id: string;
  consequence_tree: ConsequenceTree;
  narrative: string;
  key_risks: string[];
  upside_scenarios: string[];
  confidence_score: number;
  timeline_months: number;
}

/**
 * Flatten a consequence tree into a Map<id, ConsequenceNode> for O(1) lookup.
 * Uses an index pointer instead of Array.shift() to keep BFS at O(N) rather than O(N²).
 */
export function flattenTree(node: ConsequenceNode): Map<string, ConsequenceNode> {
  const map = new Map<string, ConsequenceNode>();
  const queue: ConsequenceNode[] = [node];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    map.set(current.id, current);
    for (const child of current.children) {
      queue.push(child);
    }
  }
  return map;
}

/**
 * Returns the maximum depth of the tree (root = depth 0).
 */
export function getDepth(node: ConsequenceNode): number {
  if (!node.children || node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(getDepth));
}

/**
 * Returns a copy of the tree truncated to maxDepth levels deep.
 * Nodes beyond maxDepth are removed from children arrays.
 */
export function truncateToDepth(
  node: ConsequenceNode,
  maxDepth: number,
  currentDepth = 0,
): ConsequenceNode {
  if (currentDepth >= maxDepth) {
    return { ...node, children: [] };
  }
  return {
    ...node,
    children: node.children.map((child) =>
      truncateToDepth(child, maxDepth, currentDepth + 1),
    ),
  };
}

/**
 * Returns the hex fill color for a node based on its probability.
 * green ≥ 0.70 | amber 0.40–0.69 | red < 0.40
 */
export function getColorForProbability(p: number): string {
  if (p >= 0.7) return "#16a34a"; // green-600
  if (p >= 0.4) return "#d97706"; // amber-600
  return "#dc2626"; // red-600
}

/**
 * Returns an SVG stroke-dasharray string for a link based on its probability.
 * High (≥0.70): solid (empty string) | Medium (0.40–0.69): dashed | Low (<0.40): dotted
 */
export function getStrokeDashForProbability(p: number): string {
  if (p >= 0.7) return ""; // solid
  if (p >= 0.4) return "5,3"; // dashed
  return "2,4"; // dotted
}

/**
 * Count total nodes in a tree.
 */
export function countNodes(node: ConsequenceNode): number {
  return 1 + node.children.reduce((acc, c) => acc + countNodes(c), 0);
}

/**
 * Truncate a label to max 20 characters, appending "…" if needed.
 */
export function truncateLabel(label: string, maxLen = 20): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + "…";
}
