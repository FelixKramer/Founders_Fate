"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ConsequenceNode } from "@/lib/consequence-tree-utils";

interface CounterfactualPanelProps {
  node: ConsequenceNode | null;
  allNodes: Map<string, ConsequenceNode>;
  open: boolean;
  onClose: () => void;
  onNodeSelect: (node: ConsequenceNode) => void;
}

function typeColor(type: ConsequenceNode["type"]) {
  switch (type) {
    case "risk":
      return "destructive" as const;
    case "opportunity":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

function reversibilityLabel(r: number): string {
  if (r > 0.7) return "Easily reversible";
  if (r >= 0.4) return "Moderately reversible";
  return "Hard to reverse";
}

function severityLabel(s: number): string {
  if (s >= 0.7) return "high";
  if (s >= 0.4) return "medium";
  return "low";
}

export function CounterfactualPanel({
  node,
  allNodes,
  open,
  onClose,
  onNodeSelect,
}: CounterfactualPanelProps) {
  if (!node) return null;

  const radarData = [
    {
      metric: "Severity",
      value: Math.round(node.severity * 100),
    },
    {
      metric: "Likelihood",
      value: Math.round(node.likelihood * 100),
    },
    {
      metric: "Impact",
      value: Math.round(node.impact_score * 100),
    },
  ];

  // Build narrative from node data if metadata.narrative is absent
  const narrativeText =
    typeof node.metadata.narrative === "string"
      ? node.metadata.narrative
      : `This outcome has a ${severityLabel(node.severity)} severity with a ${Math.round(
          node.likelihood * 100,
        )}% chance of occurring. It is ${reversibilityLabel(node.reversibility).toLowerCase()}.`;

  const childNodes = node.children
    .map((c) => allNodes.get(c.id) ?? c)
    .filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={typeColor(node.type)} className="capitalize">
              {node.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(node.probability * 100)}% probability
            </span>
          </div>
          <SheetTitle className="text-lg leading-snug mt-1">
            {node.label}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Counterfactual analysis for this consequence node.
          </SheetDescription>
        </SheetHeader>

        {/* Key metrics */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Key Metrics
          </h3>

          {/* Severity */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Severity</span>
              <span className="font-medium">
                {Math.round(node.severity * 100)}%
              </span>
            </div>
            <Progress value={node.severity * 100} className="h-2" />
          </div>

          {/* Likelihood */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Likelihood</span>
              <span className="font-medium">
                {Math.round(node.likelihood * 100)}%
              </span>
            </div>
            <Progress value={node.likelihood * 100} className="h-2" />
          </div>

          {/* Reversibility */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Reversibility</span>
              <span className="font-medium">
                {Math.round(node.reversibility * 100)}%
              </span>
            </div>
            <Progress value={node.reversibility * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {reversibilityLabel(node.reversibility)}
            </p>
          </div>
        </div>

        {/* Radar chart */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Profile
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={70}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11 }}
              />
              <Radar
                name="Node"
                dataKey="value"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Narrative */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Analysis
          </h3>
          <p className="text-sm leading-relaxed text-foreground/80">
            {narrativeText}
          </p>
        </div>

        {/* Children */}
        {childNodes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Leads to
            </h3>
            <div className="flex flex-wrap gap-2">
              {childNodes.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onNodeSelect(child)}
                  className="px-2.5 py-1 rounded-full border text-xs font-medium hover:bg-muted transition-colors"
                  style={{
                    borderColor: getNodeBorderColor(child.type),
                    color: getNodeTextColor(child.type),
                  }}
                >
                  {child.label.length > 24
                    ? child.label.slice(0, 23) + "…"
                    : child.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function getNodeBorderColor(type: ConsequenceNode["type"]): string {
  switch (type) {
    case "risk":
      return "#fca5a5"; // red-300
    case "opportunity":
      return "#86efac"; // green-300
    default:
      return "#d1d5db"; // gray-300
  }
}

function getNodeTextColor(type: ConsequenceNode["type"]): string {
  switch (type) {
    case "risk":
      return "#dc2626"; // red-600
    case "opportunity":
      return "#16a34a"; // green-600
    default:
      return "#6b7280"; // gray-500
  }
}
