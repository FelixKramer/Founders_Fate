import { NextResponse } from "next/server";
import { withErrorHandling, ValidationError } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

function generateCode(): string {
  return randomBytes(9).toString("base64url").slice(0, 12).toUpperCase();
}

export const POST = withErrorHandling(async (req: Request) => {
  const admin = await requireAdmin();
  const body = await req.json();
  const { cap, expiresInDays, note } = body as {
    cap?: number;
    expiresInDays?: number;
    note?: string;
  };

  if (!cap || cap < 1) throw new ValidationError("cap must be >= 1");
  if (!expiresInDays || expiresInDays < 1) throw new ValidationError("expiresInDays must be >= 1");

  const code = generateCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.inviteCode.create({
      data: {
        code,
        createdById: admin.id,
        maxUses: cap,
        expiresAt,
        notes: note ?? null,
      },
    }),
    db.adminAuditLog.create({
      data: {
        actorId: admin.id,
        action: "invite_code_created",
        resource: code,
        after: { code, cap, expiresInDays, note },
      },
    }),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://founderfate.app";
  return NextResponse.json({
    code,
    url: `${baseUrl}/invite/${code}`,
  });
});

export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 25;

  const [invites, total] = await Promise.all([
    db.inviteCode.findMany({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    }),
    db.inviteCode.count(),
  ]);

  return NextResponse.json({ invites, total, page });
});
