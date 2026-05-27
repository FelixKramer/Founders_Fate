/**
 * GET /api/scenarios
 *
 * Public endpoint (no auth required) that returns the scenario library.
 * Optional ?archetype= query param filters by archetype_compatibility.
 *
 * Auth: optionalSession — callable logged-out; session used for future
 * personalisation (e.g. highlighting compatible scenarios).
 */

import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { optionalSession } from "@/lib/guards";
import { ALL_SCENARIOS, getScenariosForArchetype } from "@/lib/scenarios";

export const GET = withErrorHandling(async (req: Request) => {
  // Session is read but not required — future: personalise ordering.
  await optionalSession();

  const { searchParams } = new URL(req.url);
  const archetype = searchParams.get("archetype");

  const scenarios = archetype
    ? getScenariosForArchetype(archetype)
    : ALL_SCENARIOS;

  return NextResponse.json({ scenarios });
});
