import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminModerationPage() {
  await requireAdmin();

  // CustomModel table may not exist yet — wrap defensively
  let flagged: {
    id: string;
    name: string;
    qualityScore: number | null;
    sourceType: string;
    createdAt: Date;
    user: { email: string; name: string | null } | null;
  }[] = [];
  let ready: { id: string; name: string; qualityScore: number | null }[] = [];

  try {
    flagged = await (prisma as any).customModel.findMany({
      where: { status: "ready", qualityScore: { lt: 0.7 } },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    ready = await (prisma as any).customModel.findMany({
      where: { status: "ready", qualityScore: { gte: 0.7 } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch {
    // Table not yet migrated — show empty state
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Model Moderation</h1>
        <p className="text-muted-foreground">
          Custom domain models auto-flagged below the 70% quality threshold.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-600">
              {flagged.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Below threshold (flagged)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{ready.length}</p>
            <p className="text-sm text-muted-foreground">Approved &amp; ready</p>
          </CardContent>
        </Card>
      </div>

      {flagged.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Flagged Models</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {flagged.map((model) => (
              <div
                key={model.id}
                className="flex items-start justify-between gap-4 py-3 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{model.name}</span>
                    <Badge variant="destructive">
                      {((model.qualityScore ?? 0) * 100).toFixed(0)}% quality
                    </Badge>
                    <Badge variant="outline">{model.sourceType}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {model.user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(model.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
            No models flagged. All custom models meet the quality threshold.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
