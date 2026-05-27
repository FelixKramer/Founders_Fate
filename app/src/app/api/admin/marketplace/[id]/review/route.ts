import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { db } from "@/lib/db";
import { withErrorHandling, ValidationError } from "@/lib/errors";

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const { action, notes } = await req.json();

    if (!["approve", "reject", "remove"].includes(action))
      throw new ValidationError("action must be approve, reject, or remove");

    const statusMap: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      remove: "removed",
    };

    const updated = await (db as any).marketplaceScenario.update({
      where: { id },
      data: {
        status: statusMap[action],
        reviewNotes: notes ?? null,
        reviewedAt: new Date(),
        ...(action === "approve" ? { publishedAt: new Date() } : {}),
      },
    });

    return NextResponse.json(updated);
  },
);
