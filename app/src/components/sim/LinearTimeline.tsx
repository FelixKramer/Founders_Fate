"use client";

import React from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConsequenceNode } from "@/lib/consequence-tree-utils";

interface LinearTimelineProps {
  root: ConsequenceNode;
  keyRisks: string[];
  upsideScenarios: string[];
}

function ProbabilityGauge({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={96} height={96} className="-rotate-90">
        <circle
          cx={48}
          cy={48}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={8}
        />
        <circle
          cx={48}
          cy={48}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
      <span className="text-xs text-muted-foreground">Probability</span>
    </div>
  );
}

export function LinearTimeline({
  root,
  keyRisks,
  upsideScenarios,
}: LinearTimelineProps) {
  return (
    <div className="space-y-6">
      {/* Single outcome card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-8">
          <ProbabilityGauge probability={root.probability} />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs text-muted-foreground mb-1 capitalize">
              {root.type}
            </p>
            <h2 className="text-xl font-bold mb-2">{root.label}</h2>
            {typeof root.metadata.narrative === "string" && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {root.metadata.narrative}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3 italic">
              Only one consequence was modelled for this scenario.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Key risks */}
        {keyRisks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Key Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {keyRisks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Upside scenarios */}
        {upsideScenarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                Upside Scenarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {upsideScenarios.map((up, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    {up}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
