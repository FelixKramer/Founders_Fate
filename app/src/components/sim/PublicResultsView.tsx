"use client";

import React, { useState, useCallback } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsequenceTreeComponent } from "@/components/sim/ConsequenceTree";
import { LinearTimeline } from "@/components/sim/LinearTimeline";
import {
  ConsequenceNode,
  SimulationResults,
} from "@/lib/consequence-tree-utils";
import { DisclaimerFooter } from "@/components/compliance/DisclaimerFooter";

interface PublicResultsViewProps {
  results: SimulationResults;
  scenarioTitle: string;
}

export function PublicResultsView({
  results,
  scenarioTitle: _scenarioTitle,
}: PublicResultsViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    undefined,
  );

  // On the public page, node selection is a no-op (no counterfactual panel).
  const handleNodeSelect = useCallback((_node: ConsequenceNode) => {
    setSelectedNodeId(_node.id);
  }, []);

  const tree = results.consequence_tree;
  const isSingleNode = tree.total_nodes <= 1;

  return (
    <div className="space-y-6">
      {/* Decision context */}
      <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Decision: </span>
        {results.decision_option_id}
        {" · "}
        <span className="font-medium text-foreground">Archetype: </span>
        {results.archetype}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left — consequence tree */}
        <div className="lg:col-span-3">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Consequence Tree
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
              selectedNodeId={selectedNodeId}
              className="min-h-[520px]"
            />
          )}
        </div>

        {/* Right — sidebar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Key risks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Key risks
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
                Upside scenarios
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

          {/* Confidence */}
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

      {/* Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this means</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
            {results.narrative}
          </p>
        </CardContent>
      </Card>

      {/* AI liability disclaimer */}
      <DisclaimerFooter />
    </div>
  );
}
