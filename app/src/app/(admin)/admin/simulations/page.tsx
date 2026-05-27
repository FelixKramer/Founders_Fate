import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SimulationDetailSheet from "@/components/admin/SimulationDetailSheet";

const PAGE_SIZE = 25;

interface SearchParams {
  status?: string;
  scenario?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: string;
  detail?: string;
}

const VALID_STATUSES = ["queued", "running", "completed", "failed", "cancelled"];

async function getSims(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (params.status && VALID_STATUSES.includes(params.status)) {
    where.status = params.status;
  }
  if (params.scenario) where.scenarioId = { contains: params.scenario };
  if (params.userId) where.userId = params.userId;
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
  }

  const [sims, total] = await Promise.all([
    db.simulationRecord.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        usageLogs: { select: { costUsd: true, latencyMs: true } },
      },
    }),
    db.simulationRecord.count({ where }),
  ]);

  return { sims, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

async function getSimDetail(id: string) {
  return db.simulationRecord.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      usageLogs: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          stage: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          costUsd: true,
          latencyMs: true,
          cacheHit: true,
          createdAt: true,
        },
      },
    },
  });
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    completed: "text-emerald-700 border-emerald-300",
    running: "text-blue-700 border-blue-300",
    queued: "text-amber-700 border-amber-300",
    failed: "text-red-700 border-red-300",
    cancelled: "text-slate-500 border-slate-300",
  };
  return colors[status] ?? "";
}

function duration(start?: Date | null, end?: Date | null) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default async function AdminSimulationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { sims, total, page, totalPages } = await getSims(sp);

  const detailSim = sp.detail ? await getSimDetail(sp.detail) : null;

  function buildUrl(overrides: Partial<SearchParams>) {
    const merged = { ...sp, ...overrides };
    const p = new URLSearchParams();
    if (merged.status) p.set("status", merged.status);
    if (merged.scenario) p.set("scenario", merged.scenario);
    if (merged.userId) p.set("userId", merged.userId);
    if (merged.from) p.set("from", merged.from);
    if (merged.to) p.set("to", merged.to);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const qs = p.toString();
    return `/admin/simulations${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {detailSim && <SimulationDetailSheet sim={detailSim} closeHref={buildUrl({})} />}

      <div>
        <h1 className="text-2xl font-bold">Simulations</h1>
        <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} total simulations</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form action="/admin/simulations" method="GET" className="flex flex-wrap gap-3">
            <Select name="status" defaultValue={sp.status ?? ""}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {VALID_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="scenario" defaultValue={sp.scenario ?? ""} placeholder="Scenario ID…" className="w-48" />
            <Input name="userId" defaultValue={sp.userId ?? ""} placeholder="User ID…" className="w-48" />
            <Input name="from" type="date" defaultValue={sp.from ?? ""} className="w-40" />
            <Input name="to" type="date" defaultValue={sp.to ?? ""} className="w-40" />
            <Button type="submit">Filter</Button>
            {(sp.status || sp.scenario || sp.userId || sp.from || sp.to) && (
              <Button variant="ghost" asChild>
                <Link href="/admin/simulations">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sims.map((sim) => {
                const cost = sim.usageLogs.reduce((s, l) => s + Number(l.costUsd), 0);
                return (
                  <TableRow key={sim.id}>
                    <TableCell className="font-mono text-xs">{sim.id.slice(0, 16)}…</TableCell>
                    <TableCell className="text-xs">{sim.user.email}</TableCell>
                    <TableCell className="text-xs">{sim.scenarioId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusColor(sim.status)}`}>
                        {sim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sim.startedAt ? new Date(sim.startedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{duration(sim.startedAt, sim.completedAt)}</TableCell>
                    <TableCell className="text-xs">${cost.toFixed(4)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/simulations?detail=${sim.id}`}>Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sims.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No simulations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl({ page: String(page - 1) })}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildUrl({ page: String(page + 1) })}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
