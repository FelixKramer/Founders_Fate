"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsequenceTreeComponent } from "@/components/sim/ConsequenceTree";
import { Badge } from "@/components/ui/badge";
import {
  SimulationResults,
  flattenTree,
  ConsequenceNode,
} from "@/lib/consequence-tree-utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SimRecord {
  id: string;
  scenarioId: string;
  decisionOptionId: string | null;
  status: string;
  createdAt: string;
}

interface CompareData {
  a: { simulation: SimRecord; results: SimulationResults };
  b: { simulation: SimRecord; results: SimulationResults };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchCompare(a: string, b: string): Promise<CompareData> {
  const res = await fetch(`/api/sim/compare?a=${a}&b=${b}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "Failed to load comparison");
  }
  return res.json();
}

/**
 * Build a delta map: normalize each node label from tree A and B,
 * find matches, and flag those with >20% probability difference.
 */
function buildDeltaMap(
  rootA: ConsequenceNode,
  rootB: ConsequenceNode,
): Map<string, { probA: number; probB: number }> {
  const mapA = flattenTree(rootA);
  const mapB = flattenTree(rootB);

  // Build lookup by normalized label for tree B.
  const bByLabel = new Map<string, ConsequenceNode>();
  for (const node of mapB.values()) {
    bByLabel.set(node.label.toLowerCase().trim(), node);
  }

  const delta = new Map<string, { probA: number; probB: number }>();
  for (const nodeA of mapA.values()) {
    const key = nodeA.label.toLowerCase().trim();
    const nodeB = bByLabel.get(key);
    if (!nodeB) continue;
    const diff = Math.abs(nodeA.probability - nodeB.probability);
    if (diff > 0.2) {
      delta.set(key, { probA: nodeA.probability, probB: nodeB.probability });
    }
  }
  return delta;
}

// ─── Stats row ─────────────────────────────────────────────────────────────

function StatRow({
  label,
  a,
  b,
  format = (v: number) => String(v),
  higherIsBetter = true,
}: {
  label: string;
  a: number;
  b: number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const diff = b - a;
  const isPositive = higherIsBetter ? diff > 0 : diff < 0;
  const isNeutral = diff === 0;

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 text-sm font-medium">{label}</td>
      <td className="py-3 pr-4 text-sm text-center">{format(a)}</td>
      <td className="py-3 pr-4 text-sm text-center">{format(b)}</td>
      <td className="py-3 text-sm text-center">
        {isNeutral ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={isPositive ? "text-green-600" : "text-red-600"}>
            {diff > 0 ? "+" : ""}
            {format(diff)}
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const searchParams = useSearchParams();
  const aId = searchParams.get("a") ?? "";
  const bId = searchParams.get("b") ?? "";

  const { data, isLoading, isError, error } = useQuery<CompareData, Error>({
    queryKey: ["compare", aId, bId],
    queryFn: () => fetchCompare(aId, bId),
    enabled: Boolean(aId && bId),
    retry: false,
  });

  const deltaMap = useMemo(() => {
    if (!data) return new Map<string, { probA: number; probB: number }>();
    return buildDeltaMap(
      data.a.results.consequence_tree.root,
      data.b.results.consequence_tree.root,
    );
  }, [data]);

  // Missing params
  if (!aId || !bId) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold">Two simulations required</h1>
          <p className="text-sm text-muted-foreground">
            Use <code className="font-mono text-xs">/sim/compare?a=&#60;simId&#62;&amp;b=&#60;simId&#62;</code> to compare two simulations.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/hub">Back to Hub</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !data) {
    const msg = error?.message ?? "Failed to load comparison";
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Cannot compare</h1>
          <p className="text-sm text-muted-foreground">{msg}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/hub">Back to Hub</Link>
          </Button>
        </div>
      </main>
    );
  }

  const { a, b } = data;
  const rA = a.results;
  const rB = b.results;

  const scenarioId = a.simulation.scenarioId;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
            {scenarioId}
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Comparing 2 simulation runs
          </h1>
          {deltaMap.size > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-yellow-500" />
              {deltaMap.size} node{deltaMap.size === 1 ? "" : "s"} differ by
              more than 20% probability between runs
            </div>
          )}
        </div>

        {/* Two-column trees */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Simulation A */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Run A
              </h2>
              {a.simulation.decisionOptionId && (
                <Badge variant="outline" className="text-xs">
                  {a.simulation.decisionOptionId}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(a.simulation.createdAt).toLocaleDateString("en-US")}
              </span>
            </div>
            <ConsequenceTreeComponent
              tree={rA.consequence_tree}
              onNodeSelect={() => {}}
              className="min-h-[480px]"
              deltaHighlights={deltaMap}
            />
          </div>

          {/* Simulation B */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Run B
              </h2>
              {b.simulation.decisionOptionId && (
                <Badge variant="outline" className="text-xs">
                  {b.simulation.decisionOptionId}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(b.simulation.createdAt).toLocaleDateString("en-US")}
              </span>
            </div>
            <ConsequenceTreeComponent
              tree={rB.consequence_tree}
              onNodeSelect={() => {}}
              className="min-h-[480px]"
              deltaHighlights={deltaMap}
            />
          </div>
        </div>

        {/* Stats comparison table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key metrics comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 text-left font-medium">Metric</th>
                    <th className="pb-2 pr-4 text-center font-medium">
                      Run A
                    </th>
                    <th className="pb-2 pr-4 text-center font-medium">
                      Run B
                    </th>
                    <th className="pb-2 text-center font-medium">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <StatRow
                    label="Confidence Score"
                    a={rA.confidence_score}
                    b={rB.confidence_score}
                    format={(v) => `${Math.round(v * 100)}%`}
                    higherIsBetter={true}
                  />
                  <StatRow
                    label="Timeline (months)"
                    a={rA.timeline_months}
                    b={rB.timeline_months}
                    format={(v) => `${Math.round(v)}mo`}
                    higherIsBetter={false}
                  />
                  <StatRow
                    label="Key Risk Count"
                    a={rA.key_risks.length}
                    b={rB.key_risks.length}
                    format={(v) => String(Math.round(v))}
                    higherIsBetter={false}
                  />
                  <StatRow
                    label="Upside Count"
                    a={rA.upside_scenarios.length}
                    b={rB.upside_scenarios.length}
                    format={(v) => String(Math.round(v))}
                    higherIsBetter={true}
                  />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="flex gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/sim/${aId}/results`}>Back to Run A</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/sim/${bId}/results`}>Back to Run B</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
