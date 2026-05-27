import { requireAdmin } from "@/lib/guards";
import { ALL_SCENARIOS } from "@/lib/scenarios";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function AdminScenariosPage() {
  await requireAdmin();

  // Get run counts per scenario
  const runCounts = await prisma.simulationRecord.groupBy({
    by: ["scenarioId"],
    _count: { id: true },
    _max: { createdAt: true },
  });
  const countMap = Object.fromEntries(
    runCounts.map((r) => [
      r.scenarioId,
      { count: r._count.id, lastRun: r._max.createdAt },
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scenario Library</h1>
        <p className="text-muted-foreground">
          Browse and inspect the {ALL_SCENARIOS.length} launch scenarios.
        </p>
      </div>
      <div className="grid gap-4">
        {ALL_SCENARIOS.map((scenario) => {
          const stats = countMap[scenario.id] ?? { count: 0, lastRun: null };
          const varCount = Object.keys(scenario.parameters ?? {}).length;
          return (
            <Card key={scenario.id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{scenario.title}</span>
                    <Badge variant="secondary">{varCount} variables</Badge>
                    <Badge variant="outline">{stats.count} runs</Badge>
                    <Badge variant="outline">{scenario.difficulty}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scenario.description}
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {(scenario.archetype_compatibility ?? []).map((a) => (
                      <Badge key={a} variant="outline" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(scenario.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {stats.lastRun && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last run:{" "}
                      {new Date(stats.lastRun).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <details className="text-xs w-full sm:w-80">
                  <summary className="cursor-pointer text-primary hover:underline text-sm">
                    View JSON
                  </summary>
                  <ScrollArea className="h-48 mt-2">
                    <pre className="bg-muted rounded p-2 overflow-auto text-xs">
                      {JSON.stringify(scenario, null, 2)}
                    </pre>
                  </ScrollArea>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
