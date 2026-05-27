/**
 * /premortem — Enterprise Pre-Mortem Analysis page.
 *
 * Server component: verifies session + enterprise tier, then renders
 * the interactive PremortemClient component.
 */

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasTier } from "@/lib/tier";
import type { Tier } from "@/lib/tier";
import PremortemClient from "./PremortemClient";

export const metadata = {
  title: "Enterprise Pre-Mortem — Founder Fate",
  description:
    "Upload your business plan and run a Monte Carlo failure analysis across hundreds of scenarios.",
};

export default async function PremortemPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?from=/premortem");
  }

  const userTier = ((session.user as { tier?: string }).tier ?? "free") as Tier;
  if (!hasTier(userTier, "enterprise")) {
    redirect("/pricing?upgrade=enterprise");
  }

  return <PremortemClient />;
}
