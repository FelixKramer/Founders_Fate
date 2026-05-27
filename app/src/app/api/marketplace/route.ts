import { NextRequest, NextResponse } from "next/server";
import { requireTierAtLeast } from "@/lib/guards";
import { withErrorHandling, ValidationError, NotFoundError } from "@/lib/errors";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";

// GET /api/marketplace — public browse (no auth required for viewing)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 12;

  const where: Record<string, unknown> = { status: "approved" };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { has: search.toLowerCase() } },
    ];
  }

  const [scenarios, total] = await Promise.all([
    (db as any).marketplaceScenario.findMany({
      where,
      orderBy: [{ useCount: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        archetypes: true,
        tags: true,
        qualityScore: true,
        viewCount: true,
        useCount: true,
        publishedAt: true,
        author: { select: { name: true } },
      },
    }),
    (db as any).marketplaceScenario.count({ where }),
  ]);

  return NextResponse.json({ scenarios, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/marketplace — submit custom model to marketplace (Pro+ only)
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireTierAtLeast("pro");
  const { customModelId, category, tags = [] } = await req.json();

  if (!customModelId || !category) throw new ValidationError("customModelId and category are required");

  const validCategories = ["hiring", "fundraising", "gtm", "pivot", "operations", "product"];
  if (!validCategories.includes(category))
    throw new ValidationError(`category must be one of: ${validCategories.join(", ")}`);

  // Verify ownership and readiness
  const model = await (db as any).customModel.findFirst({
    where: { id: customModelId, userId: session.id },
  });
  if (!model) throw new NotFoundError();
  if (model.status !== "ready") throw new ValidationError("Model must be in ready status");
  if ((model.qualityScore ?? 0) < 0.7) throw new ValidationError("Quality score must be ≥ 70% to publish");

  // Check not already submitted
  const existing = await (db as any).marketplaceScenario.findUnique({
    where: { customModelId },
  });
  if (existing) throw new ValidationError("This model is already submitted to the marketplace");

  const scenarioJson = model.scenarioJson ?? {};
  const listing = await (db as any).marketplaceScenario.create({
    data: {
      customModelId,
      authorId: session.id,
      title: (scenarioJson as any).title ?? model.name,
      description: (scenarioJson as any).description ?? model.description ?? "",
      category,
      tags: (tags as string[]).slice(0, 10),
      archetypes: (scenarioJson as any).archetypes ?? [],
      qualityScore: model.qualityScore,
      scenarioJson,
    },
  });

  await track("fate_marketplace_submitted", { userId: session.id, listingId: listing.id, category });

  return NextResponse.json(listing, { status: 201 });
});
