"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "active" | "complete";

export interface ProgressStep {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  /** id of the currently active step */
  activeStepId?: string;
  /** ids of completed steps */
  completedStepIds?: string[];
  className?: string;
}

/**
 * 4-step (or N-step) visual stepper.  Each step shows an icon, a label, and
 * a status indicator (pending grey ring / active indigo spinner / complete
 * green check).  Completed steps get a connecting line to the next step.
 */
export function ProgressSteps({
  steps,
  activeStepId,
  completedStepIds = [],
  className,
}: ProgressStepsProps) {
  function getStatus(stepId: string): StepStatus {
    if (completedStepIds.includes(stepId)) return "complete";
    if (stepId === activeStepId) return "active";
    return "pending";
  }

  return (
    <ol className={cn("flex flex-col gap-3", className)}>
      {steps.map((step, idx) => {
        const status = getStatus(step.id);
        const isLast = idx === steps.length - 1;

        return (
          <li key={step.id} className="flex items-start gap-3">
            {/* Icon column */}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  status === "complete" &&
                    "border-green-500 bg-green-500 text-white",
                  status === "active" &&
                    "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950",
                  status === "pending" &&
                    "border-muted-foreground/30 bg-background text-muted-foreground/50",
                )}
              >
                {status === "complete" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : status === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  step.icon ?? (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mt-1 h-6 w-0.5 rounded-full transition-colors",
                    completedStepIds.includes(step.id)
                      ? "bg-green-500"
                      : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>

            {/* Label column */}
            <div className="pt-1">
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  status === "complete" && "text-green-600 dark:text-green-400",
                  status === "active" && "text-indigo-600 dark:text-indigo-400",
                  status === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
