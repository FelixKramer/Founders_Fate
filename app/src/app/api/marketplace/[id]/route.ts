import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NotFoundError, errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const listing = await (db as any).marketplaceScenario.findFirst({
      where: { id, status: "approved" },
      include: { author: { select: { name: true } } },
    });
    if (!listing) throw new NotFoundError();

    // Increment view count asynchronously — fire-and-forget
    (db as any).marketplaceScenario
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

    return NextResponse.json(listing);
  } catch (err) {
    return errorResponse(err);
  }
}
