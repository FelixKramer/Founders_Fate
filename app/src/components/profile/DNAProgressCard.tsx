"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DNAStatus = "queued" | "running" | "completed" | "failed";

type DNAStatusResponse = {
  status: string;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchDNAStatus(): Promise<DNAStatusResponse> {
  const res = await fetch("/api/profile/dna/status");
  if (!res.ok) throw new Error("Failed to fetch DNA status");
  return res.json();
}

// ─── Stage labels ─────────────────────────────────────────────────────────────

const STAGES = [
  "Analysing your simulation history",
  "Identifying cognitive patterns",
  "Generating personalised report",
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function DNAProgressCard({ status }: { status?: DNAStatus }) {
  const [activeStage, setActiveStage] = useState(0);

  // Cycle through stage labels every 4s for visual progression.
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((s) => (s + 1) % STAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
        <div>
          <p className="font-semibold text-sm">Generating your report…</p>
          <p className="text-xs text-muted-foreground">This usually takes 20–60 seconds</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {STAGES.map((stage, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`h-2 w-2 rounded-full shrink-0 transition-colors duration-500 ${
                i < activeStage
                  ? "bg-indigo-500"
                  : i === activeStage
                  ? "bg-indigo-400 animate-pulse"
                  : "bg-muted"
              }`}
            />
            <span
              className={`text-sm transition-colors duration-500 ${
                i <= activeStage
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Polling variant (used independently) ─────────────────────────────────────

export function DNAProgressCardPolling({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const { data } = useQuery<DNAStatusResponse>({
    queryKey: ["dna-status"],
    queryFn: fetchDNAStatus,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 10_000;
    },
  });

  useEffect(() => {
    if (data?.status === "completed" && onComplete) {
      onComplete();
    }
  }, [data?.status, onComplete]);

  const status = (data?.status ?? "queued") as DNAStatus;
  return <DNAProgressCard status={status} />;
}
