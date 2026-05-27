"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DNAStatusResponse = {
  status: "not_started" | "queued" | "running" | "completed" | "failed";
  report?: unknown;
  simulations_needed?: number;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchDNAStatus(): Promise<DNAStatusResponse> {
  const res = await fetch("/api/profile/dna/status");
  if (!res.ok) throw new Error("Failed to fetch DNA status");
  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DNAReadyBadge — mounts in the root layout and polls DNA status every 30s.
 *
 * When the status transitions to 'completed' it:
 *  1. Fires a sonner toast with a CTA that navigates to /profile?tab=dna.
 *  2. Stores a "seen" flag in sessionStorage so the toast only fires once per session.
 *
 * Renders nothing visible — the badge dot is handled by nav-level integration.
 */
export function DNAReadyBadge() {
  const router = useRouter();
  const qc = useQueryClient();
  const prevStatus = useRef<string | null>(null);
  const toastFiredRef = useRef(false);

  const { data } = useQuery<DNAStatusResponse>({
    queryKey: ["dna-status"],
    queryFn: fetchDNAStatus,
    // Only poll when status is actively in-progress.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed" || status === "not_started") {
        return false;
      }
      return 30_000;
    },
    // Don't re-fetch on window focus when already complete.
    refetchOnWindowFocus: (query) => {
      const status = query.state.data?.status;
      return status !== "completed" && status !== "not_started";
    },
    staleTime: 60_000,
  });

  const status = data?.status;

  useEffect(() => {
    if (!status) return;

    // Check sessionStorage to avoid repeated toasts.
    const seenKey = "ff_dna_ready_toast_shown";
    const alreadySeen =
      typeof window !== "undefined" && sessionStorage.getItem(seenKey) === "1";

    if (
      status === "completed" &&
      prevStatus.current !== "completed" &&
      !alreadySeen &&
      !toastFiredRef.current
    ) {
      toastFiredRef.current = true;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(seenKey, "1");
      }

      toast("Your Decision DNA report is ready!", {
        description: "See your cognitive biases, patterns, and recommendations.",
        icon: <Brain className="h-4 w-4 text-indigo-500" />,
        action: {
          label: "View report",
          onClick: () => {
            router.push("/profile?tab=dna");
          },
        },
        duration: 10_000,
      });

      // Invalidate profile query so the tab shows the ready state.
      void qc.invalidateQueries({ queryKey: ["profile"] });
    }

    prevStatus.current = status;
  }, [status, router, qc]);

  // This component renders nothing — it's a side-effect-only poller.
  return null;
}
