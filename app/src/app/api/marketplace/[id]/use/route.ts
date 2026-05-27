import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/guards";
import { db } from "@/lib/db";
import { NotFoundError, errorResponse } from "@/lib/errors";
import { track } from "@/lib/analytics";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const listing = await (db as any).marketplaceScenario.findFirst({
      where: { id, status: "approved" },
    });
    if (!listing) throw new NotFoundError();

    // Create a CustomModel for this user from the marketplace listing
    const copied = await (db as any).customModel.create({
      data: {
        userId: session.id,
        name: `${listing.title} (from Marketplace)`,
        description: listing.description,
        sourceType: "marketplace",
        status: "ready",
        qualityScore: listing.qualityScore,
        scenarioJson: listing.scenarioJson,
      },
    });

    // Increment use count — fire-and-forget
    (db as any).marketplaceScenario
      .update({ where: { id }, data: { useCount: { increment: 1 } } })
      .catch(() => {});

    await track("fate_marketplace_scenario_used", { userId: session.id, listingId: id });

    return NextResponse.json({ success: true, modelId: copied.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
