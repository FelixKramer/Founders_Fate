"use client";

import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  ConsequenceNode,
  ConsequenceTree as ConsequenceTreeType,
  getColorForProbability,
  getStrokeDashForProbability,
  truncateLabel,
  truncateToDepth,
  flattenTree,
  countNodes,
} from "@/lib/consequence-tree-utils";
import { trackClient } from "@/lib/analytics-client";

// ── D3 types (client-side only) ──────────────────────────────────────────────
type D3HierarchyNode = {
  data: ConsequenceNode;
  x: number;
  y: number;
  depth: number;
  parent: D3HierarchyNode | null;
  children?: D3HierarchyNode[];
  id?: string;
};

interface ConsequenceTreeProps {
  tree: ConsequenceTreeType;
  onNodeSelect: (node: ConsequenceNode) => void;
  selectedNodeId?: string;
  className?: string;
  /** Optional map from node label (normalized) to { probA, probB } for delta highlighting. */
  deltaHighlights?: Map<string, { probA: number; probB: number }>;
}

const DEEP_VIEW_THRESHOLD = 50;
const MAX_DEPTH_DEFAULT = 3;
const NODE_RADIUS_NORMAL = 20;
const NODE_RADIUS_LEAF = 14;

export function ConsequenceTreeComponent({
  tree,
  onNodeSelect,
  selectedNodeId,
  className,
  deltaHighlights,
}: ConsequenceTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [showAll, setShowAll] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const totalNodes = tree.total_nodes;
  const needsDeepView = totalNodes > DEEP_VIEW_THRESHOLD;

  // Compute the visible tree (truncated or full)
  const visibleRoot = useMemo(() => {
    if (needsDeepView && !showAll) {
      return truncateToDepth(tree.root, MAX_DEPTH_DEFAULT);
    }
    return tree.root;
  }, [tree.root, needsDeepView, showAll]);

  const visibleNodeMap = useMemo(
    () => flattenTree(visibleRoot),
    [visibleRoot],
  );

  const visibleCount = useMemo(
    () => countNodes(visibleRoot),
    [visibleRoot],
  );

  const hiddenCount = totalNodes - visibleCount;

  // Track container width for responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute all node IDs in traversal order for keyboard navigation
  const nodeOrder = useMemo(() => {
    const ids: string[] = [];
    const traverse = (node: ConsequenceNode) => {
      ids.push(node.id);
      for (const child of node.children) traverse(child);
    };
    traverse(visibleRoot);
    return ids;
  }, [visibleRoot]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (!focusedNodeId) {
        if (e.key === "Tab" || e.key === "ArrowRight") {
          setFocusedNodeId(nodeOrder[0] ?? null);
          e.preventDefault();
        }
        return;
      }

      const node = visibleNodeMap.get(focusedNodeId);
      if (!node) return;

      switch (e.key) {
        case "Tab": {
          const idx = nodeOrder.indexOf(focusedNodeId);
          const next = e.shiftKey
            ? nodeOrder[idx - 1]
            : nodeOrder[idx + 1];
          if (next) {
            setFocusedNodeId(next);
            e.preventDefault();
          }
          break;
        }
        case "ArrowDown": {
          if (node.children.length > 0) {
            setFocusedNodeId(node.children[0].id);
          }
          e.preventDefault();
          break;
        }
        case "ArrowUp": {
          if (node.parent_id) {
            setFocusedNodeId(node.parent_id);
          }
          e.preventDefault();
          break;
        }
        case "ArrowRight": {
          if (node.children.length > 0) {
            setFocusedNodeId(node.children[0].id);
          }
          e.preventDefault();
          break;
        }
        case "ArrowLeft": {
          if (node.parent_id) {
            setFocusedNodeId(node.parent_id);
          }
          e.preventDefault();
          break;
        }
        case "Enter":
        case " ": {
          onNodeSelect(node);
          e.preventDefault();
          break;
        }
      }
    },
    [focusedNodeId, nodeOrder, visibleNodeMap, onNodeSelect],
  );

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || typeof window === "undefined") return;

    // Dynamic import D3 to ensure client-side only
    import("d3").then((d3) => {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const margin = { top: 40, right: 120, bottom: 40, left: 100 };
      const svgWidth = containerWidth;
      const svgHeight = 520;
      const width = svgWidth - margin.left - margin.right;
      const height = svgHeight - margin.top - margin.bottom;

      // Set viewBox
      d3.select(svgRef.current)
        .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
        .attr("width", "100%")
        .attr("height", svgHeight);

      // Zoom + pan
      const g = svg.append("g").attr("class", "tree-root");

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);

      // Double-click to reset
      svg.on("dblclick.zoom", () => {
        svg
          .transition()
          .duration(500)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(margin.left, margin.top),
          );
      });

      // Initial translate
      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(margin.left, margin.top),
      );

      // Build hierarchy
      const root = d3
        .hierarchy<ConsequenceNode>(visibleRoot, (d) => d.children)
        .sort((a, b) => b.data.probability - a.data.probability);

      // Horizontal tree layout (left-to-right)
      const treeLayout = d3
        .tree<ConsequenceNode>()
        .size([height, width])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

      const treeData = treeLayout(root);

      // Links
      const linkGroup = g.append("g").attr("class", "links");

      linkGroup
        .selectAll("path")
        .data(treeData.links())
        .join("path")
        .attr("fill", "none")
        .attr("stroke", (d) => {
          const col = getColorForProbability(d.target.data.probability);
          return col;
        })
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", (d) =>
          getStrokeDashForProbability(d.target.data.probability),
        )
        .attr(
          "d",
          d3
            .linkHorizontal<
              d3.HierarchyLink<ConsequenceNode>,
              d3.HierarchyNode<ConsequenceNode>
            >()
            .x((d) => d.y)
            .y((d) => d.x),
        );

      // Nodes
      const nodeGroup = g.append("g").attr("class", "nodes");

      const nodes = nodeGroup
        .selectAll("g")
        .data(treeData.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.y},${d.x})`)
        .attr("tabindex", 0)
        .attr("role", "treeitem")
        .attr("aria-expanded", (d) =>
          d.children && d.children.length > 0 ? "true" : "false",
        )
        .attr(
          "aria-label",
          (d) =>
            `${d.data.label} — ${Math.round(d.data.probability * 100)}% probability`,
        )
        .style("cursor", "pointer")
        .on("click", (_event, d) => {
          void trackClient("fate_tree_node_clicked", {
            simulation_id: tree.root.id,
            node_id: d.data.id,
            depth: d.depth,
            has_narrative: Boolean(d.data.metadata?.narrative),
          });
          onNodeSelect(d.data);
        })
        .on("focus", (_event, d) => {
          setFocusedNodeId(d.data.id);
        });

      // Node circles
      nodes
        .append("circle")
        .attr("r", (d) =>
          d.children || (d as D3HierarchyNode).children
            ? NODE_RADIUS_NORMAL
            : NODE_RADIUS_LEAF,
        )
        .attr("fill", (d) => getColorForProbability(d.data.probability))
        .attr("stroke", (d) => {
          if (d.data.id === selectedNodeId) return "#fff";
          if (d.data.id === focusedNodeId) return "#f59e0b";
          return "none";
        })
        .attr("stroke-width", (d) => {
          if (
            d.data.id === selectedNodeId ||
            d.data.id === focusedNodeId
          )
            return 3;
          return 0;
        })
        .attr("fill-opacity", 0.85);

      // Delta highlight rings — yellow outer ring on nodes with >20% probability difference.
      if (deltaHighlights && deltaHighlights.size > 0) {
        nodes
          .filter((d) => {
            const key = d.data.label.toLowerCase().trim();
            return deltaHighlights.has(key);
          })
          .append("circle")
          .attr("r", (d) =>
            (d.children || (d as D3HierarchyNode).children
              ? NODE_RADIUS_NORMAL
              : NODE_RADIUS_LEAF) + 5,
          )
          .attr("fill", "none")
          .attr("stroke", "#eab308") // yellow-500
          .attr("stroke-width", 2.5)
          .attr("stroke-dasharray", "4,2")
          .append("title")
          .text((d) => {
            const key = d.data.label.toLowerCase().trim();
            const delta = deltaHighlights.get(key);
            if (!delta) return "";
            return `A: ${Math.round(delta.probA * 100)}% / B: ${Math.round(delta.probB * 100)}%`;
          });
      }

      // Node labels
      nodes
        .append("text")
        .attr("dy", "0.35em")
        .attr("x", (d) => {
          const r =
            d.children ? NODE_RADIUS_NORMAL : NODE_RADIUS_LEAF;
          return d.children && d.children.length > 0 ? -(r + 6) : r + 6;
        })
        .attr("text-anchor", (d) =>
          d.children && d.children.length > 0 ? "end" : "start",
        )
        .attr("font-size", "11px")
        .attr("fill", "currentColor")
        .attr("class", "select-none")
        .text((d) => truncateLabel(d.data.label, 20));

      // Probability label inside node
      nodes
        .append("text")
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .text((d) => `${Math.round(d.data.probability * 100)}%`);
    });
  }, [visibleRoot, containerWidth, selectedNodeId, focusedNodeId, onNodeSelect, deltaHighlights]);

  return (
    <div ref={containerRef} className={`relative w-full ${className ?? ""}`}>
      {/* Deep view banner */}
      {needsDeepView && (
        <div className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 mb-2 text-xs text-amber-800 dark:text-amber-200">
          <span>
            This tree has {totalNodes} nodes. Showing top {visibleCount}.
            {hiddenCount > 0 && (
              <span className="ml-1 text-amber-600 dark:text-amber-400">
                ({hiddenCount} hidden)
              </span>
            )}
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="ml-4 font-semibold underline underline-offset-2 hover:no-underline"
          >
            {showAll ? "Show less" : "Show all →"}
          </button>
        </div>
      )}

      {/* Color legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a]" />
          High probability (≥70%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#d97706]" />
          Medium (40–69%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#dc2626]" />
          Low (&lt;40%)
        </span>
      </div>

      <svg
        ref={svgRef}
        role="tree"
        aria-label="Consequence tree"
        className="w-full overflow-hidden rounded-md border bg-muted/30"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      />
    </div>
  );
}
