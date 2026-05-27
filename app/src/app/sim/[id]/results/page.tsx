import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALL_SCENARIOS } from "@/lib/scenarios";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ResultsView } from "@/components/sim/ResultsView";
import type { SimulationResults } from "@/lib/consequence-tree-utils";

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchResults(
  simulationId: string,
  baseUrl: string,
): Promise<SimulationResults | null> {
  try {
    const res = await fetch(`${baseUrl}/api/sim/${simulationId}/results`, {
      cache: "no-store",
    });
    if (res.status === 200) {
      return (await res.json()) as SimulationResults;
    }
    // 202 = still running
    if (res.status === 202) {
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function SimResultsPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations("fate.sim.results");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?from=/sim/${id}/results`);
  }

  const record = await db.simulationRecord.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true, scenarioId: true, topInsight: true },
  });

  if (!record) {
    notFound();
  }

  if (record.status !== "completed") {
    redirect(`/sim/${id}`);
  }

  const scenario = ALL_SCENARIOS.find((s) => s.id === record.scenarioId);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  const results = await fetchResults(id, baseUrl);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* Breadcrumb header */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <Link href="/hub" className="hover:underline">
              Hub
            </Link>
            <ChevronRight className="inline h-3.5 w-3.5 mx-1 text-muted-foreground/60" />
            {scenario?.title ?? record.scenarioId}
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("heading")}</h1>
        </div>

        {results ? (
          <ResultsView
            simulationId={id}
            results={results}
            scenarioTitle={scenario?.title ?? record.scenarioId}
          />
        ) : (
          /* Results not yet available */
          <div className="rounded-lg border bg-card p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Results are not yet available. They will appear here once
              processing is complete.
            </p>
            <Link
              href={`/sim/${id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
            >
              Check progress
            </Link>
          </div>
        )}

        {/* Back to hub */}
        <div className="flex justify-start pt-2">
          <Link
            href="/hub"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Hub
          </Link>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Results — Simulation ${id} — Founder Fate`,
  };
}
