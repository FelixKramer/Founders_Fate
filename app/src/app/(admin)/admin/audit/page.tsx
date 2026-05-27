import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Download, ClipboardList } from "lucide-react";

const PAGE_SIZE = 50;

interface SearchParams {
  action?: string;
  adminId?: string;
  from?: string;
  to?: string;
  page?: string;
}

async function getAuditLog(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (params.action) where.action = { contains: params.action };
  if (params.adminId) where.actorId = params.adminId;
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
  }

  const [entries, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { email: true } },
        targetUser: { select: { email: true } },
      },
    }),
    db.adminAuditLog.count({ where }),
  ]);

  return { entries, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

function truncateJson(obj: unknown): string {
  if (!obj) return "—";
  const s = JSON.stringify(obj);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { entries, total, page, totalPages } = await getAuditLog(sp);

  function buildUrl(overrides: Partial<SearchParams>) {
    const merged = { ...sp, ...overrides };
    const p = new URLSearchParams();
    if (merged.action) p.set("action", merged.action);
    if (merged.adminId) p.set("adminId", merged.adminId);
    if (merged.from) p.set("from", merged.from);
    if (merged.to) p.set("to", merged.to);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const qs = p.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  }

  const exportParams = new URLSearchParams();
  if (sp.from) exportParams.set("from", sp.from);
  if (sp.to) exportParams.set("to", sp.to);
  if (sp.action) exportParams.set("action", sp.action);
  const exportHref = `/api/admin/audit/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} entries</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={exportHref} download>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form action="/admin/audit" method="GET" className="flex flex-wrap gap-3">
            <Input name="action" defaultValue={sp.action ?? ""} placeholder="Action filter…" className="w-44" />
            <Input name="adminId" defaultValue={sp.adminId ?? ""} placeholder="Admin user ID…" className="w-48" />
            <Input name="from" type="date" defaultValue={sp.from ?? ""} className="w-40" />
            <Input name="to" type="date" defaultValue={sp.to ?? ""} className="w-40" />
            <Button type="submit">Filter</Button>
            {(sp.action || sp.adminId || sp.from || sp.to) && (
              <Button variant="ghost" asChild>
                <Link href="/admin/audit">Clear</Link>
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
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No audit entries found.
                  </TableCell>
                </TableRow>
              )}
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("en-US", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </TableCell>
                  <TableCell className="text-xs">{entry.actor.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{entry.targetUser?.email ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {entry.resource ? entry.resource.slice(0, 24) : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground max-w-[160px] truncate">
                    {truncateJson(entry.before)}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground max-w-[160px] truncate">
                    {truncateJson(entry.after)}
                  </TableCell>
                </TableRow>
              ))}
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
