"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ALL_SCENARIOS } from "@/lib/scenarios";
import { ProgressSteps, type ProgressStep } from "@/components/ui/progress-steps";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  XCircle,
  RotateCcw,
  Loader2,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stage definitions — order matches the SSE stage codes
const STAGES: ProgressStep[] = [
  { id: "ontology_gen", label: "Building founder DNA ontology" },
  { id: "dna_synthesis", label: "Synthesising agent personas" },
  { id: "cascade_step", label: "Running consequence cascade" },
  { id: "narrative_gen", label: "Generating narrative" },
];

// Map pct → active stage
function pctToStageId(pct: number): string {
  if (pct < 30) return "ontology_gen";
  if (pct < 50) return "dna_synthesis";
  if (pct < 85) return "cascade_step";
  return "narrative_gen";
}

function getCompletedStageIds(pct: number): string[] {
  const completed: string[] = [];
  if (pct >= 30) completed.push("ontology_gen");
  if (pct >= 50) completed.push("dna_synthesis");
  if (pct >= 85) completed.push("cascade_step");
  if (pct >= 100) completed.push("narrative_gen");
  return completed;
}

interface SimError {
  code: string;
  detail: string;
}

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  spend_cap_exceeded: {
    title: "Spend limit reached",
    body: "You've reached your monthly AI usage limit.",
  },
  llm_unavailable: {
    title: "AI service temporarily unavailable",
    body: "Our AI provider is experiencing issues. Please try again in a few minutes.",
  },
  internal_error: {
    title: "Simulation failed",
    body: "Something went wrong on our end. Our team has been notified.",
  },
};

function getErrorMessages(code: string) {
  return (
    ERROR_MESSAGES[code] ?? {
      title: "Simulation failed",
      body: "Something went wrong. Please try again.",
    }
  );
}

interface SimProgressViewProps {
  simulationId: string;
  initialStatus: string;
}

export function SimProgressView({
  simulationId,
  initialStatus,
}: SimProgressViewProps) {
  const t = useTranslations("fate.sim");
  const router = useRouter();

  const [pct, setPct] = useState(0);
  const [stageId, setStageId] = useState<string>("ontology_gen");
  const [error, setError] = useState<SimError | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // Get scenario name from local data
  // scenarioId is embedded in the URL; we derive it from the sim record elsewhere.
  // Since SimProgressView only receives simulationId, we load scenario lazily.
  // The scenario name resolution would normally come from a fetched record —
  // for now we display the simulation ID in the heading.

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setReconnecting(false);

    const es = new EventSource(`/api/sim/${simulationId}/progress`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      if (unmountedRef.current) return;
      try {
        const payload = JSON.parse(event.data) as {
          event: "progress" | "done" | "error";
          data: unknown;
        };

        if (payload.event === "progress") {
          const data = payload.data as { stage: string; pct: number };
          setStageId(data.stage ?? pctToStageId(data.pct));
          setPct(data.pct);
        } else if (payload.event === "done") {
          es.close();
          router.push(`/sim/${simulationId}/results`);
        } else if (payload.event === "error") {
          es.close();
          setError(payload.data as SimError);
        }
      } catch {
        // malformed JSON; ignore
      }
    };

    es.onerror = () => {
      if (unmountedRef.current) return;
      es.close();
      esRef.current = null;
      setReconnecting(true);
      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect();
      }, 3000);
    };
  }, [simulationId, router]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      esRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await fetch(`/api/sim/${simulationId}/cancel`, { method: "POST" });
      router.push("/hub");
    } catch {
      setCancelling(false);
    }
  }

  async function handleRetry() {
    // Try to retrieve saved params from sessionStorage
    const stored = sessionStorage.getItem(`ff_sim_params_last`);
    if (stored) {
      try {
        const data = JSON.parse(stored) as {
          scenario_id: string;
          decision_option_id: string;
          parameters: Record<string, unknown>;
        };

        const res = await fetch("/api/sim/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.status === 201) {
          const json = (await res.json()) as { simulation_id: string };
          router.push(`/sim/${json.simulation_id}`);
          return;
        }
      } catch {
        // fall through
      }
    }
    // Fallback — go to hub
    router.push("/hub");
  }

  const completedStageIds = getCompletedStageIds(pct);
  const activeStageId = stageId ?? pctToStageId(pct);

  if (error) {
    const { title, body } = getErrorMessages(error.code);
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-800 dark:text-red-200">
                  {title}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                {process.env.NODE_ENV === "development" && (
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Code: {error.code} — {error.detail}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleRetry}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("error.retry")}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/hub")}
              className="flex-1"
            >
              {t("error.backToHub")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel simulation?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("progress.cancelConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XIcon className="mr-2 h-4 w-4" />
              )}
              Cancel simulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{t("progress.heading")}</h1>
          {reconnecting && (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("progress.reconnecting")}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-8 py-8">
            {/* Overall progress bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(pct)}%
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>

            {/* Stages */}
            <ProgressSteps
              steps={STAGES}
              activeStepId={activeStageId}
              completedStepIds={completedStageIds}
            />

            {/* Cancel */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <XIcon className="mr-1.5 h-3.5 w-3.5" />
                {t("progress.cancelButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
