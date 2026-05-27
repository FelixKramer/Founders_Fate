import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALL_SCENARIOS } from "@/lib/scenarios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

// Shape returned by GET /api/sim/[id]/results
interface SimResults {
  consequence_tree: unknown;
  narrative: string;
  key_risks: string[];
  upside_scenarios: string[];
  confidence_score: number;
  timeline_months: number;
}

async function fetchResults(
  simulationId: string,
  baseUrl: string,
): Promise<SimResults | null> {
  try {
    const res = await fetch(`${baseUrl}/api/sim/${simulationId}/results`, {
      // M6 will serve this; no auth header needed — cookie forwarded server-side
      cache: "no-store",
    });
    if (res.status === 200) {
      return (await res.json()) as SimResults;
    }
    // 202 = still running
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

  // Attempt to load results from M6 API (may not exist yet in dev)
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  const results = await fetchResults(id, baseUrl);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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
          {results && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("confidence")}</p>
                <p className="text-lg font-bold">
                  {Math.round(results.confidence_score * 100)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Outlook</p>
                <p className="text-lg font-bold flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {t("timeline", { months: results.timeline_months })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Consequence tree placeholder */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{t("treeComingSoon")}</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Full consequence tree visualisation launches in M8.
            </p>
          </CardContent>
        </Card>

        {results ? (
          <>
            {/* Narrative */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("narrative")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {results.narrative}
                </p>
              </CardContent>
            </Card>

            {/* Key risks + upside grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Key risks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    {t("keyRisks")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {results.key_risks.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {results.key_risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No risks identified.</p>
                  )}
                </CardContent>
              </Card>

              {/* Upside scenarios */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    {t("upsideScenarios")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {results.upside_scenarios.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {results.upside_scenarios.map((up, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                          {up}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upside scenarios identified.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Raw JSON fallback for dev */}
            {process.env.NODE_ENV === "development" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-muted-foreground">
                    Consequence tree (raw JSON — M8 placeholder)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-64 whitespace-pre-wrap">
                    {JSON.stringify(results.consequence_tree, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Results are not yet available. They will appear here once processing is complete.
              </p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link href={`/sim/${id}`}>Check progress</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to hub */}
        <div className="flex justify-start">
          <Button asChild variant="ghost">
            <Link href="/hub">
              <ChevronRight className="mr-1.5 h-4 w-4 rotate-180" />
              Back to Hub
            </Link>
          </Button>
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
