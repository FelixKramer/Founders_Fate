import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, DollarSign, Zap } from "lucide-react";

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalUsers, activeSimulations, simsToday, costResult] = await Promise.all([
    db.user.count(),
    db.simulationRecord.count({
      where: { status: { in: ["queued", "running"] } },
    }),
    db.simulationRecord.count({
      where: { createdAt: { gte: startOfToday } },
    }),
    db.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM("costUsd"), 0)::text AS total
      FROM "UsageLog"
      WHERE "createdAt" >= ${startOfMonth}
    `,
  ]);

  const totalCostMonth = parseFloat(costResult[0]?.total ?? "0");
  return { totalUsers, activeSimulations, simsToday, totalCostMonth };
}

async function getRecentAuditLog() {
  return db.adminAuditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { email: true } },
      targetUser: { select: { email: true } },
    },
  });
}

async function getRecentFailedSims() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return db.simulationRecord.findMany({
    where: { status: "failed", createdAt: { gte: since } },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } } },
  });
}

function formatCost(usd: number) {
  return `$${usd.toFixed(2)}`;
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function AdminOverviewPage() {
  const [stats, auditLog, failedSims] = await Promise.all([
    getStats(),
    getRecentAuditLog(),
    getRecentFailedSims(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform health at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Active Simulations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSimulations}</div>
            <p className="text-xs text-muted-foreground">queued + running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Simulations Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.simsToday.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Cost This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(stats.totalCostMonth)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lower sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent audit log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Admin Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin actions yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                      {entry.action}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{entry.actor.email}</span>
                      {entry.targetUser && (
                        <span className="text-muted-foreground"> → {entry.targetUser.email}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent failures */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Failures (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {failedSims.length === 0 ? (
              <p className="text-sm text-muted-foreground text-emerald-600">No failures in the last 24 hours.</p>
            ) : (
              <div className="space-y-2">
                {failedSims.map((sim) => (
                  <div key={sim.id} className="flex items-start gap-2 text-sm">
                    <Badge variant="destructive" className="text-xs shrink-0 mt-0.5">
                      failed
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{sim.user.email}</span>
                      <span className="text-muted-foreground text-xs">{sim.scenarioId}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {timeAgo(sim.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
