"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, CheckCircle, XCircle, Loader2, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScenarioResult {
  scenario_id: string;
  score: number;
  passed: boolean;
}

interface FidelityResponse {
  score: number | null;
  status?: string;
  running?: boolean;
  last_run_at?: string;
  scenario_count?: number;
  passing?: number;
  threshold?: number;
  results?: ScenarioResult[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 0.75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.60) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function ScoreBadge({ score, passed }: { score: number; passed: boolean }) {
  return (
    <Badge
      className={cn(
        "font-mono text-xs",
        passed
          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
          : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
      )}
    >
      {(score * 100).toFixed(1)}%
    </Badge>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminFidelityPage() {
  const [data, setData] = useState<FidelityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const fetchFidelity = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fidelity");
      if (res.ok) {
        const json = await res.json() as FidelityResponse;
        setData(json);
        // Stop polling once a run completes
        if (!json.running) {
          setPollInterval((prev) => {
            if (prev) clearInterval(prev);
            return null;
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFidelity();
  }, [fetchFidelity]);

  async function handleRunBacktest() {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/fidelity/run", { method: "POST" });
      if (res.ok) {
        // Poll every 5 s until the run completes
        const id = setInterval(() => { void fetchFidelity(); }, 5000);
        setPollInterval(id);
        void fetchFidelity();
      }
    } finally {
      setTriggering(false);
    }
  }

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const isRunning = data?.running ?? false;
  const score = data?.score ?? null;
  const threshold = data?.threshold ?? 0.60;
  const lastRunAt = data?.last_run_at
    ? new Date(data.last_run_at).toLocaleString()
    : "Never";
  const results = data?.results ?? [];
  const notRunYet = data?.status === "not_run_yet" || data?.score === null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6" />
            Fidelity Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Backtest score measures LLM consequence-tree consistency across repeated runs.
          </p>
        </div>
        <Button
          onClick={handleRunBacktest}
          disabled={triggering || isRunning}
          className="gap-2"
        >
          {triggering || isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isRunning ? "Running…" : "Triggering…"}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Run Backtest
            </>
          )}
        </Button>
      </div>

      {/* Summary Card */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Overall Score */}
          <Card className="sm:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Fidelity Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notRunYet ? (
                <p className="text-muted-foreground text-sm">Not run yet</p>
              ) : (
                <div className="flex items-end gap-2">
                  <span className={cn("text-5xl font-bold tabular-nums", scoreColor(score))}>
                    {score !== null ? `${(score * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Threshold: {(threshold * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>

          {/* Pass / Fail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scenarios Passing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notRunYet ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{data?.passing ?? 0}</span>
                  <span className="text-muted-foreground text-sm">/ {data?.scenario_count ?? 0}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">scenarios above threshold</p>
            </CardContent>
          </Card>

          {/* Last Run */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Run
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{lastRunAt}</p>
              {isRunning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Backtest in progress…
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {!loading && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scenario Results</CardTitle>
            <CardDescription>
              Per-scenario fidelity score from the most recent backtest run.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario ID</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.scenario_id}>
                    <TableCell className="font-mono text-sm">{r.scenario_id}</TableCell>
                    <TableCell className="text-right">
                      <ScoreBadge score={r.score} passed={r.passed} />
                    </TableCell>
                    <TableCell className="text-right">
                      {r.passed ? (
                        <span className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Pass
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-destructive text-sm">
                          <XCircle className="h-3.5 w-3.5" />
                          Fail
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!loading && notRunYet && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <BarChart2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              No backtest results yet. Click &ldquo;Run Backtest&rdquo; to start.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
