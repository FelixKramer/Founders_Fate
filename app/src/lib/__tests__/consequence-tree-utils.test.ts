import { describe, it, expect } from "vitest";
import {
  flattenTree,
  getDepth,
  truncateToDepth,
  getColorForProbability,
  getStrokeDashForProbability,
  countNodes,
  truncateLabel,
  type ConsequenceNode,
} from "../consequence-tree-utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  prob: number,
  children: ConsequenceNode[] = [],
  type: ConsequenceNode["type"] = "neutral"
): ConsequenceNode {
  return {
    id,
    label: id,
    type,
    probability: prob,
    impact_score: 0.5,
    severity: 0.5,
    likelihood: 0.5,
    reversibility: 0.5,
    parent_id: null,
    children,
    metadata: {},
  };
}

// root → mid → leaf (depth = 2)
const leaf = makeNode("leaf", 0.6);
const mid = makeNode("mid", 0.4, [leaf]);
const root = makeNode("root", 0.8, [mid]);

// ── flattenTree ───────────────────────────────────────────────────────────────

describe("flattenTree", () => {
  it("returns a Map containing all nodes", () => {
    const map = flattenTree(root);
    expect(map.size).toBe(3);
    expect(map.has("root")).toBe(true);
    expect(map.has("mid")).toBe(true);
    expect(map.has("leaf")).toBe(true);
  });

  it("maps each id to the correct node object", () => {
    const map = flattenTree(root);
    expect(map.get("root")).toBe(root);
    expect(map.get("mid")).toBe(mid);
    expect(map.get("leaf")).toBe(leaf);
  });

  it("single-node tree returns a map of size 1", () => {
    const single = makeNode("solo", 0.5);
    const map = flattenTree(single);
    expect(map.size).toBe(1);
    expect(map.has("solo")).toBe(true);
  });

  it("handles wide tree (multiple children at root)", () => {
    const c1 = makeNode("c1", 0.7);
    const c2 = makeNode("c2", 0.5);
    const c3 = makeNode("c3", 0.3);
    const wide = makeNode("wide", 0.9, [c1, c2, c3]);
    const map = flattenTree(wide);
    expect(map.size).toBe(4);
  });

  it("handles deep tree (chain of 4)", () => {
    const d4 = makeNode("d4", 0.2);
    const d3 = makeNode("d3", 0.3, [d4]);
    const d2 = makeNode("d2", 0.5, [d3]);
    const d1 = makeNode("d1", 0.8, [d2]);
    const map = flattenTree(d1);
    expect(map.size).toBe(4);
    expect(map.has("d4")).toBe(true);
  });
});

// ── getDepth ─────────────────────────────────────────────────────────────────

describe("getDepth", () => {
  it("returns 0 for a leaf node", () => {
    expect(getDepth(leaf)).toBe(0);
  });

  it("returns 1 for root with one level of children", () => {
    const parent = makeNode("p", 0.5, [makeNode("ch", 0.5)]);
    expect(getDepth(parent)).toBe(1);
  });

  it("returns 2 for root → mid → leaf", () => {
    expect(getDepth(root)).toBe(2);
  });

  it("returns depth of deepest branch when branches differ", () => {
    const shallowChild = makeNode("sc", 0.5);
    const deepLeaf = makeNode("dl", 0.3);
    const deepMid = makeNode("dm", 0.4, [deepLeaf]);
    const asymmetric = makeNode("asym", 0.8, [shallowChild, deepMid]);
    expect(getDepth(asymmetric)).toBe(2);
  });
});

// ── truncateToDepth ───────────────────────────────────────────────────────────

describe("truncateToDepth", () => {
  it("depth 0 removes all children", () => {
    const result = truncateToDepth(root, 0);
    expect(result.children).toHaveLength(0);
  });

  it("depth 1 keeps first level, strips second", () => {
    const result = truncateToDepth(root, 1);
    expect(result.children).toHaveLength(1);
    expect(result.children[0].id).toBe("mid");
    expect(result.children[0].children).toHaveLength(0);
  });

  it("depth 2 keeps the full tree", () => {
    const result = truncateToDepth(root, 2);
    expect(result.children[0].children[0].id).toBe("leaf");
  });

  it("depth greater than tree depth returns unchanged tree", () => {
    const result = truncateToDepth(root, 10);
    expect(result.children[0].children[0].id).toBe("leaf");
  });

  it("does not mutate the original tree", () => {
    truncateToDepth(root, 0);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe("mid");
  });

  it("preserves node data on remaining nodes", () => {
    const result = truncateToDepth(root, 1);
    expect(result.probability).toBe(root.probability);
    expect(result.id).toBe(root.id);
  });
});

// ── getColorForProbability ────────────────────────────────────────────────────

describe("getColorForProbability", () => {
  it("returns green (#16a34a) for probability >= 0.7", () => {
    expect(getColorForProbability(0.7)).toBe("#16a34a");
    expect(getColorForProbability(0.8)).toBe("#16a34a");
    expect(getColorForProbability(0.9)).toBe("#16a34a");
    expect(getColorForProbability(1.0)).toBe("#16a34a");
  });

  it("returns amber (#d97706) for probability 0.4–0.69", () => {
    expect(getColorForProbability(0.4)).toBe("#d97706");
    expect(getColorForProbability(0.5)).toBe("#d97706");
    expect(getColorForProbability(0.6)).toBe("#d97706");
    expect(getColorForProbability(0.69)).toBe("#d97706");
  });

  it("returns red (#dc2626) for probability < 0.4", () => {
    expect(getColorForProbability(0.0)).toBe("#dc2626");
    expect(getColorForProbability(0.1)).toBe("#dc2626");
    expect(getColorForProbability(0.3)).toBe("#dc2626");
    expect(getColorForProbability(0.39)).toBe("#dc2626");
  });

  it("boundary: 0.7 is green (not amber)", () => {
    expect(getColorForProbability(0.7)).toBe("#16a34a");
    expect(getColorForProbability(0.699)).toBe("#d97706");
  });

  it("boundary: 0.4 is amber (not red)", () => {
    expect(getColorForProbability(0.4)).toBe("#d97706");
    expect(getColorForProbability(0.399)).toBe("#dc2626");
  });
});

// ── getStrokeDashForProbability ───────────────────────────────────────────────

describe("getStrokeDashForProbability", () => {
  it("returns empty string (solid) for probability >= 0.7", () => {
    expect(getStrokeDashForProbability(0.7)).toBe("");
    expect(getStrokeDashForProbability(1.0)).toBe("");
    expect(getStrokeDashForProbability(0.8)).toBe("");
  });

  it("returns dashed pattern (5,3) for probability 0.4–0.69", () => {
    expect(getStrokeDashForProbability(0.5)).toBe("5,3");
    expect(getStrokeDashForProbability(0.4)).toBe("5,3");
    expect(getStrokeDashForProbability(0.69)).toBe("5,3");
  });

  it("returns dotted pattern (2,4) for probability < 0.4", () => {
    expect(getStrokeDashForProbability(0.3)).toBe("2,4");
    expect(getStrokeDashForProbability(0.0)).toBe("2,4");
    expect(getStrokeDashForProbability(0.39)).toBe("2,4");
  });

  it("dashed pattern contains a comma", () => {
    const dashed = getStrokeDashForProbability(0.5);
    expect(dashed).toContain(",");
  });

  it("dotted pattern contains a comma", () => {
    const dotted = getStrokeDashForProbability(0.2);
    expect(dotted).toContain(",");
  });
});

// ── countNodes ────────────────────────────────────────────────────────────────

describe("countNodes", () => {
  it("counts 1 for a single leaf", () => {
    expect(countNodes(leaf)).toBe(1);
  });

  it("counts 2 for parent + one child", () => {
    const parent = makeNode("p", 0.5, [makeNode("c", 0.5)]);
    expect(countNodes(parent)).toBe(2);
  });

  it("counts 3 for root → mid → leaf", () => {
    expect(countNodes(root)).toBe(3);
  });

  it("counts correctly for wide tree", () => {
    const c1 = makeNode("c1", 0.5);
    const c2 = makeNode("c2", 0.5);
    const c3 = makeNode("c3", 0.5);
    const wide = makeNode("w", 0.5, [c1, c2, c3]);
    expect(countNodes(wide)).toBe(4);
  });

  it("counts correctly for deep chain of 5", () => {
    const n5 = makeNode("n5", 0.5);
    const n4 = makeNode("n4", 0.5, [n5]);
    const n3 = makeNode("n3", 0.5, [n4]);
    const n2 = makeNode("n2", 0.5, [n3]);
    const n1 = makeNode("n1", 0.5, [n2]);
    expect(countNodes(n1)).toBe(5);
  });
});

// ── truncateLabel ─────────────────────────────────────────────────────────────

describe("truncateLabel", () => {
  it("returns label unchanged when <= 20 chars", () => {
    expect(truncateLabel("short")).toBe("short");
    expect(truncateLabel("exactly twenty chars")).toBe("exactly twenty chars");
  });

  it("truncates and appends ellipsis for > 20 chars", () => {
    const result = truncateLabel("This is a very long label");
    expect(result.length).toBe(20);
    expect(result.endsWith("…")).toBe(true);
  });

  it("respects custom maxLen", () => {
    const result = truncateLabel("Hello World", 5);
    expect(result.length).toBe(5);
    expect(result.endsWith("…")).toBe(true);
  });

  it("empty string returns empty string", () => {
    expect(truncateLabel("")).toBe("");
  });
});
