import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = typeof val === "object" ? JSON.stringify(val) : String(val);
  // Escape double-quotes and wrap in quotes if contains comma, newline, or double-quote
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin();

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const action = url.searchParams.get("action");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (action) where.action = { contains: action };

  const entries = await db.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000, // safety cap
    include: {
      actor: { select: { email: true } },
      targetUser: { select: { email: true } },
    },
  });

  const headers = ["timestamp", "admin_email", "action", "target_email", "resource", "before", "after", "ip"];
  const rows = entries.map((e) => [
    e.createdAt.toISOString(),
    e.actor.email,
    e.action,
    e.targetUser?.email ?? "",
    e.resource ?? "",
    e.before ? JSON.stringify(e.before) : "",
    e.after ? JSON.stringify(e.after) : "",
    e.ip ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");

  const dateStr = new Date().toISOString().split("T")[0];
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-${dateStr}.csv"`,
    },
  });
});
