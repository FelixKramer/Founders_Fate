/**
 * GET /api/scenarios/:id
 *
 * Returns a single scenario by its slug id.
 * Auth: optionalSession — public read.
 */

import { NextResponse } from "next/server";
import { withErrorHandling, NotFoundError } from "@/lib/errors";
import { optionalSession } from "@/lib/guards";
import { getScenario } from "@/lib/scenarios";

export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    await optionalSession();

    const { id } = await params;
    const scenario = getScenario(id);

    if (!scenario) {
      throw new NotFoundError(`scenario not found: ${id}`);
    }

    return NextResponse.json({ scenario });
  },
);
