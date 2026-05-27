/**
 * /sim/share/:code — Public read-only share page.
 *
 * Server component — no auth required. The middleware already allows
 * /sim/share/ as a public prefix.
 *
 * We call the existing public share API (/api/sim/share/:code) which handles
 * the viewCount increment and validity checking in one shot.
 */

import Link from "next/link";
import { ALL_SCENARIOS } from "@/lib/scenarios";
import { PublicResultsView } from "@/components/sim/PublicResultsView";
import type { SimulationResults } from "@/lib/consequence-tree-utils";

interface Props {
  params: Promise<{ code: string }>;
}

interface ShareApiResponse {
  share: {
    code: string;
    expiresAt: string;
    viewCount: number;
  };
  simulation: {
    scenario_id: string;
    results: SimulationResults | null;
  };
}

export default async function SharePage({ params }: Props) {
  const { code } = await params;

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  let data: ShareApiResponse | null = null;
  try {
    const res = await fetch(`${baseUrl}/api/sim/share/${code}`, {
      cache: "no-store",
    });
    if (res.ok) {
      data = (await res.json()) as ShareApiResponse;
    }
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center space-y-4">
          <h1 className="text-xl font-bold">Link unavailable</h1>
          <p className="text-muted-foreground text-sm">
            This share link is invalid, expired, or has been revoked.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2 hover:no-underline"
          >
            Go to Founder Fate &rarr;
          </Link>
        </div>
      </main>
    );
  }

  const { share, simulation } = data;

  const scenario = ALL_SCENARIOS.find((s) => s.id === simulation.scenario_id);
  const scenarioTitle = scenario?.title ?? simulation.scenario_id;

  const expiresDate = new Date(share.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const viewCount = share.viewCount;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* Top banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Shared simulation results
            </p>
            <p className="text-lg font-bold mt-0.5">{scenarioTitle}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
            <span>
              Viewed {viewCount} time{viewCount === 1 ? "" : "s"}
            </span>
            <span>Expires {expiresDate}</span>
          </div>
        </div>

        {simulation.results ? (
          <PublicResultsView
            results={simulation.results}
            scenarioTitle={scenarioTitle}
          />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center space-y-2">
            <p className="font-medium">Results unavailable</p>
            <p className="text-sm text-muted-foreground">
              The simulation results for this share link could not be loaded.
            </p>
          </div>
        )}

        {/* Bottom CTA banner */}
        <div className="rounded-lg border bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 p-6 text-center space-y-3">
          <p className="font-semibold text-indigo-900 dark:text-indigo-100">
            Want to run your own simulation?
          </p>
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Run your own simulation &rarr;
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground">
          These are AI-generated simulations for educational purposes only.
        </p>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  return {
    title: `Shared Simulation — Founder Fate`,
    description: `View shared simulation results (code: ${code})`,
  };
}
