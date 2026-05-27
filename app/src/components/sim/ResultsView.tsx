"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Copy,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsequenceTreeComponent } from "@/components/sim/ConsequenceTree";
import { CounterfactualPanel } from "@/components/sim/CounterfactualPanel";
import { LinearTimeline } from "@/components/sim/LinearTimeline";
import {
  ConsequenceNode,
  ConsequenceTree,
  SimulationResults,
  flattenTree,
} from "@/lib/consequence-tree-utils";

interface ResultsViewProps {
  simulationId: string;
  results: SimulationResults;
  scenarioTitle: string;
}

export function ResultsView({
  simulationId,
  results,
  scenarioTitle,
}: ResultsViewProps) {
  const t = useTranslations("fate.sim.results");

  const [selectedNode, setSelectedNode] = useState<ConsequenceNode | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tree = results.consequence_tree;
  const allNodes = React.useMemo(
    () => flattenTree(tree.root),
    [tree.root],
  );

  const handleNodeSelect = useCallback((node: ConsequenceNode) => {
    setSelectedNode(node);
    setPanelOpen(true);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const res = await fetch("/api/sim/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulationId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        const url = data.url ?? window.location.href;
        await navigator.clipboard.writeText(url);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  }, [simulationId]);

  const isSingleNode = tree.total_nodes <= 1;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="gap-2"
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              Link copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {t("shareButton")}
            </>
          )}
        </Button>

        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/hub">
            <RotateCcw className="h-4 w-4" />
            {t("runAnother")}
          </Link>
        </Button>

        <Badge variant="secondary" className="ml-auto text-sm px-3 py-1">
          {Math.round(results.confidence_score * 100)}% confidence
        </Badge>

        <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {t("timeline", { months: results.timeline_months })}
        </Badge>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left — tree (60%) */}
        <div className="lg:col-span-3">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t("treeHeading")}
          </h2>

          {isSingleNode ? (
            <LinearTimeline
              root={tree.root}
              keyRisks={results.key_risks}
              upsideScenarios={results.upside_scenarios}
            />
          ) : (
            <ConsequenceTreeComponent
              tree={tree}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNode?.id}
              className="min-h-[520px]"
            />
          )}
        </div>

        {/* Right — narrative + risks + upside (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Key risks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {t("keyRisksHeading")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.key_risks.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {results.key_risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {risk}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No risks identified.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Upside scenarios */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                {t("upsideHeading")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.upside_scenarios.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {results.upside_scenarios.map((up, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      {up}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upside scenarios identified.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Confidence meter */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium">Confidence</span>
                <span className="font-bold text-base">
                  {Math.round(results.confidence_score * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{
                    width: `${Math.round(results.confidence_score * 100)}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom — full narrative */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("narrativeHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
              {results.narrative}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Counterfactual panel */}
      <CounterfactualPanel
        node={selectedNode}
        allNodes={allNodes}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onNodeSelect={handleNodeSelect}
      />
    </>
  );
}
