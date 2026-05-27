import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasTier } from "@/lib/tier";
import type { Tier } from "@/lib/tier";
import { db } from "@/lib/db";
import PublishClient from "./PublishClient";

export const metadata = {
  title: "Publish to Marketplace — Founder Fate",
};

export default async function PublishPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?from=/marketplace/publish");
  }

  const userTier = ((session.user as { tier?: string }).tier ?? "free") as Tier;
  if (!hasTier(userTier, "pro")) {
    redirect("/pricing?upgrade=pro&from=marketplace");
  }

  // Get user's eligible custom models: ready, quality >= 0.7, not yet listed
  const models = await (db as any).customModel.findMany({
    where: {
      userId: session.user.id,
      status: "ready",
      qualityScore: { gte: 0.7 },
      marketplaceListing: null,
    },
    select: {
      id: true,
      name: true,
      qualityScore: true,
      description: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <PublishClient models={models} />;
}
