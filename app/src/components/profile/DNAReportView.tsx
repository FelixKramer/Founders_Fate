"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Brain,
  TrendingUp,
  Eye,
  Lightbulb,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DNAProgressCard } from "./DNAProgressCard";
import type {
  DNAReport,
  DNABias,
  DNAPattern,
  DNARecommendation,
} from "@/app/api/profile/dna/status/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type DNAStatusResponse = {
  status: "not_started" | "queued" | "running" | "completed" | "failed";
  report?: DNAReport;
  simulations_needed?: number;
  error?: string;
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchDNAStatus(): Promise<DNAStatusResponse> {
  const res = await fetch("/api/profile/dna/status");
  if (!res.ok) throw new Error("Failed to fetch DNA status");
  return res.json();
}

async function triggerDNA(): Promise<{ queued: boolean; job_id: string | null }> {
  const res = await fetch("/api/profile/dna", { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to trigger DNA generation");
  }
  return res.json();
}

// ─── Risk Profile Badge ───────────────────────────────────────────────────────

function RiskProfileBadge({ riskProfile }: { riskProfile: string }) {
  const colors: Record<string, string> = {
    aggressive: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
    balanced: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
    conservative: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800",
  };
  const labels: Record<string, string> = {
    aggressive: "Aggressive",
    balanced: "Balanced",
    conservative: "Conservative",
  };
  const colorClass = colors[riskProfile] ?? colors.balanced;
  const label = labels[riskProfile] ?? riskProfile;
  return (
    <span
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${colorClass}`}
    >
      {label}
    </span>
  );
}

// ─── Severity Badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: DNABias["severity"] }) {
  const map: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[severity] ?? map.low}`}>
      {severity}
    </span>
  );
}

// ─── Frequency Pill ──────────────────────────────────────────────────────────

function FrequencyPill({ frequency }: { frequency: DNAPattern["frequency"] }) {
  const map: Record<string, string> = {
    consistent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    occasional: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    rare: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[frequency] ?? map.rare}`}>
      {frequency}
    </span>
  );
}

// ─── Priority Border ─────────────────────────────────────────────────────────

function priorityBorderClass(priority: DNARecommendation["priority"]): string {
  const map: Record<string, string> = {
    high: "border-l-red-400",
    medium: "border-l-yellow-400",
    low: "border-l-green-400",
  };
  return map[priority] ?? map.low;
}

// ─── Cognitive Biases Section ─────────────────────────────────────────────────

function BiasesSection({ biases }: { biases: DNABias[] }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSE_THRESHOLD = 4;
  const visible = expanded || biases.length <= COLLAPSE_THRESHOLD
    ? biases
    : biases.slice(0, COLLAPSE_THRESHOLD);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-base">Cognitive Biases</h2>
      </div>
      <div className="space-y-3">
        {visible.map((bias, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium text-sm">{bias.name}</span>
              <SeverityBadge severity={bias.severity} />
            </div>
            <p className="text-sm text-muted-foreground">{bias.description}</p>
            {bias.evidence && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                {bias.evidence}
              </p>
            )}
          </div>
        ))}
      </div>
      {biases.length > COLLAPSE_THRESHOLD && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show all {biases.length} biases
            </>
          )}
        </Button>
      )}
    </section>
  );
}

// ─── Decision Patterns Section ────────────────────────────────────────────────

function PatternsSection({ patterns }: { patterns: DNAPattern[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-base">Decision Patterns</h2>
      </div>
      <div className="divide-y rounded-lg border overflow-hidden">
        {patterns.map((pattern, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-card">
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{pattern.name}</span>
                <FrequencyPill frequency={pattern.frequency} />
              </div>
              <p className="text-sm text-muted-foreground">{pattern.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Blind Spots Section ──────────────────────────────────────────────────────

function BlindSpotsSection({ blindSpots }: { blindSpots: string[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-base">Blind Spots</h2>
      </div>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-4 space-y-2">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">
            These are risks you tend to systematically underestimate.
          </p>
        </div>
        <ul className="space-y-1.5 pl-1">
          {blindSpots.map((spot, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-yellow-900 dark:text-yellow-200">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
              {spot}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Recommendations Section ──────────────────────────────────────────────────

function RecommendationsSection({ recommendations }: { recommendations: DNARecommendation[] }) {
  const sorted = [...recommendations].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-base">Recommendations</h2>
      </div>
      <div className="space-y-3">
        {sorted.map((rec, i) => (
          <div
            key={i}
            className={`rounded-lg border-l-4 bg-card border p-4 space-y-1 ${priorityBorderClass(rec.priority)}`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium text-sm">{rec.title}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {rec.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{rec.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Contradiction Narrative ──────────────────────────────────────────────────

function ContradictionNarrative({ narrative }: { narrative: string }) {
  if (!narrative) return null;
  return (
    <section>
      <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 p-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
            Interesting contradiction in your decision-making
          </p>
        </div>
        <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
          {narrative}
        </p>
      </div>
    </section>
  );
}

// ─── Overall Summary ──────────────────────────────────────────────────────────

function OverallSummary({ summary }: { summary: string }) {
  if (!summary) return null;
  return (
    <section className="rounded-lg border bg-muted/30 p-6">
      <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        Your founder profile
      </p>
      <blockquote className="text-base leading-relaxed font-medium">
        {summary}
      </blockquote>
    </section>
  );
}

// ─── Not Ready State ──────────────────────────────────────────────────────────

function NotReadyState({
  simsNeeded,
  totalSims,
  onGenerate,
  isGenerating,
}: {
  simsNeeded: number;
  totalSims: number;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  if (simsNeeded > 0) {
    const completed = 3 - simsNeeded;
    return (
      <div className="py-12 text-center space-y-4">
        <Brain className="h-10 w-10 text-muted-foreground mx-auto" />
        <div className="space-y-1">
          <h3 className="font-semibold">Complete 3 simulations to unlock your Decision DNA report</h3>
          <p className="text-sm text-muted-foreground">{completed}/3 simulations completed</p>
        </div>
        <Progress value={(completed / 3) * 100} className="max-w-xs mx-auto h-2" />
        <Button asChild variant="outline" size="sm">
          <Link href="/hub">
            Browse scenarios <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  // >= 3 sims but not yet triggered.
  return (
    <div className="py-12 text-center space-y-4">
      <Brain className="h-10 w-10 text-indigo-500 mx-auto" />
      <div className="space-y-1">
        <h3 className="font-semibold">Your Decision DNA is ready to generate</h3>
        <p className="text-sm text-muted-foreground">
          Based on {totalSims} completed simulation{totalSims !== 1 ? "s" : ""} across different scenarios
        </p>
      </div>
      <Button onClick={onGenerate} disabled={isGenerating} size="sm">
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          "Generate your Decision DNA"
        )}
      </Button>
    </div>
  );
}

// ─── Full Report ──────────────────────────────────────────────────────────────

function FullReport({ report }: { report: DNAReport }) {
  const archetype = report.user_id ? "" : "";
  const generatedDate = new Date(report.generated_at * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Your Decision DNA</h2>
            <p className="text-sm text-muted-foreground">
              Based on {report.simulation_count} simulation{report.simulation_count !== 1 ? "s" : ""} &bull; Generated {generatedDate}
            </p>
          </div>
          <RiskProfileBadge riskProfile={report.risk_profile} />
        </div>

        {/* Archetype Consistency Meter */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Archetype consistency</span>
            <span className="text-sm font-semibold">
              {Math.round(report.archetype_consistency * 100)}%
            </span>
          </div>
          <Progress value={report.archetype_consistency * 100} className="h-2" />
          <p className="text-xs text-muted-foreground">
            How consistently your choices align with your founder archetype
          </p>
        </Card>
      </div>

      <Separator />

      {/* Overall Summary at top for quick context */}
      {report.overall_summary && <OverallSummary summary={report.overall_summary} />}

      <Separator />

      {/* Cognitive Biases */}
      {report.cognitive_biases.length > 0 && (
        <BiasesSection biases={report.cognitive_biases} />
      )}

      {/* Decision Patterns */}
      {report.decision_patterns.length > 0 && (
        <PatternsSection patterns={report.decision_patterns} />
      )}

      {/* Blind Spots */}
      {report.blind_spots.length > 0 && (
        <BlindSpotsSection blindSpots={report.blind_spots} />
      )}

      {/* Contradiction Narrative */}
      {report.contradiction_narrative && (
        <ContradictionNarrative narrative={report.contradiction_narrative} />
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <RecommendationsSection recommendations={report.recommendations} />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DNAReportView() {
  const { data, isLoading, refetch } = useQuery<DNAStatusResponse>({
    queryKey: ["dna-status"],
    queryFn: fetchDNAStatus,
    // Stop polling once completed or failed.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 30_000;
    },
  });

  const generateMutation = useMutation({
    mutationFn: triggerDNA,
    onSuccess: () => {
      void refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = data?.status ?? "not_started";
  const simsNeeded = data?.simulations_needed ?? 3;

  if (status === "queued" || status === "running") {
    return <DNAProgressCard status={status} />;
  }

  if (status === "completed" && data?.report) {
    return <FullReport report={data.report} />;
  }

  if (status === "failed") {
    return (
      <div className="py-12 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
        <p className="font-medium">Report generation failed</p>
        <p className="text-sm text-muted-foreground">{data?.error ?? "An unknown error occurred."}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          Try again
        </Button>
      </div>
    );
  }

  // not_started or completed without report data
  return (
    <NotReadyState
      simsNeeded={simsNeeded}
      totalSims={Math.max(0, 3 - simsNeeded)}
      onGenerate={() => generateMutation.mutate()}
      isGenerating={generateMutation.isPending}
    />
  );
}
