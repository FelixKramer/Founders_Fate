import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Zap, Clock, TrendingUp } from "lucide-react";
import AdminLLMCharts from "@/components/admin/AdminLLMCharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function getLLMStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [monthCostRaw, todayCostRaw, cacheRaw, latencyRaw] = await Promise.all([
    db.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM("costUsd"), 0)::text AS total
      FROM "UsageLog"
      WHERE "createdAt" >= ${startOfMonth}
    `,
    db.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM("costUsd"), 0)::text AS total
      FROM "UsageLog"
      WHERE "createdAt" >= ${startOfToday}
    `,
    db.$queryRaw<{ hits: bigint; total: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE "cacheHit" = true) AS hits,
             COUNT(*) AS total
      FROM "UsageLog"
      WHERE "createdAt" >= ${startOfMonth}
    `,
    db.$queryRaw<{ avg_lat: string }[]>`
      SELECT COALESCE(AVG("latencyMs"), 0)::text AS avg_lat
      FROM "UsageLog"
      WHERE "createdAt" >= ${startOfMonth}
    `,
  ]);

  const monthCost = parseFloat(monthCostRaw[0]?.total ?? "0");
  const todayCost = parseFloat(todayCostRaw[0]?.total ?? "0");
  const cacheHits = Number(cacheRaw[0]?.hits ?? 0);
  const cacheTotal = Number(cacheRaw[0]?.total ?? 0);
  const cacheRate = cacheTotal > 0 ? Math.round((cacheHits / cacheTotal) * 100) : 0;
  const avgLatency = Math.round(parseFloat(latencyRaw[0]?.avg_lat ?? "0"));

  // Daily cost for last 30 days
  const byDayRaw = await db.$queryRaw<{ day: Date; total: string }[]>`
    SELECT DATE_TRUNC('day', "createdAt") AS day,
           COALESCE(SUM("costUsd"), 0)::text AS total
    FROM "UsageLog"
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  // Cost by model this month
  const byModelRaw = await db.$queryRaw<{ model: string; total: string; calls: bigint }[]>`
    SELECT model,
           COALESCE(SUM("costUsd"), 0)::text AS total,
           COUNT(*)::bigint AS calls
    FROM "UsageLog"
    WHERE "createdAt" >= ${startOfMonth}
    GROUP BY model
    ORDER BY SUM("costUsd") DESC
    LIMIT 10
  `;

  // Cost by stage this month
  const byStageRaw = await db.$queryRaw<{ stage: string; total: string }[]>`
    SELECT stage,
           COALESCE(SUM("costUsd"), 0)::text AS total
    FROM "UsageLog"
    WHERE "createdAt" >= ${startOfMonth}
    GROUP BY stage
    ORDER BY SUM("costUsd") DESC
  `;

  // Provider health
  const byProviderRaw = await db.$queryRaw<{
    provider: string;
    requests: bigint;
    errors: bigint;
    avg_lat: string;
  }[]>`
    SELECT provider,
           COUNT(*)::bigint AS requests,
           COUNT(*) FILTER (WHERE "errorCategory" IS NOT NULL)::bigint AS errors,
           COALESCE(AVG("latencyMs"), 0)::text AS avg_lat
    FROM "UsageLog"
    WHERE "createdAt" >= ${startOfMonth}
    GROUP BY provider
  `;

  // Per-user spend leaderboard
  const leaderboardRaw = await db.$queryRaw<{
    userId: string;
    email: string;
    total: string;
    sims: bigint;
  }[]>`
    SELECT ul."userId",
           u.email,
           COALESCE(SUM(ul."costUsd"), 0)::text AS total,
           COUNT(DISTINCT ul."simulationId")::bigint AS sims
    FROM "UsageLog" ul
    JOIN "User" u ON u.id = ul."userId"
    WHERE ul."createdAt" >= ${startOfMonth}
      AND ul."userId" IS NOT NULL
    GROUP BY ul."userId", u.email
    ORDER BY SUM(ul."costUsd") DESC
    LIMIT 10
  `;

  return {
    monthCost,
    todayCost,
    cacheRate,
    avgLatency,
    byDay: byDayRaw.map((r) => ({
      day: new Date(r.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost: parseFloat(r.total),
    })),
    byModel: byModelRaw.map((r) => ({
      model: r.model.split("/").pop() ?? r.model,
      cost: parseFloat(r.total),
      calls: Number(r.calls),
    })),
    byStage: byStageRaw.map((r) => ({
      stage: r.stage,
      cost: parseFloat(r.total),
    })),
    byProvider: byProviderRaw.map((r) => ({
      provider: r.provider,
      requests: Number(r.requests),
      errors: Number(r.errors),
      errorPct: Number(r.requests) > 0 ? ((Number(r.errors) / Number(r.requests)) * 100).toFixed(1) : "0",
      avgLatency: Math.round(parseFloat(r.avg_lat)),
    })),
    leaderboard: leaderboardRaw.map((r, i) => ({
      rank: i + 1,
      email: r.email,
      total: parseFloat(r.total),
      sims: Number(r.sims),
    })),
  };
}

export default async function AdminLLMPage() {
  const data = await getLLMStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LLM Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Cost and usage telemetry</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Cost This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.monthCost.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Cost Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.todayCost.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.cacheRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgLatency}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts — client component */}
      <AdminLLMCharts
        byDay={data.byDay}
        byModel={data.byModel}
        byStage={data.byStage}
      />

      {/* Provider health table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider Health (this month)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Error %</TableHead>
                <TableHead className="text-right">Avg Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byProvider.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No usage data this month.
                  </TableCell>
                </TableRow>
              )}
              {data.byProvider.map((p) => (
                <TableRow key={p.provider}>
                  <TableCell className="font-medium">{p.provider}</TableCell>
                  <TableCell className="text-right">{p.requests.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{p.errors.toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${Number(p.errorPct) > 5 ? "text-destructive font-medium" : ""}`}>
                    {p.errorPct}%
                  </TableCell>
                  <TableCell className="text-right">{p.avgLatency}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-user leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 Users by Spend (this month)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Simulations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No usage data this month.
                  </TableCell>
                </TableRow>
              )}
              {data.leaderboard.map((row) => (
                <TableRow key={row.email}>
                  <TableCell className="text-muted-foreground">{row.rank}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell className="text-right font-medium">${row.total.toFixed(4)}</TableCell>
                  <TableCell className="text-right">{row.sims}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
