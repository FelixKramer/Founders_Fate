/**
 * GET /api/premortem/[jobId]/status
 *
 * Polls the MiroFish job registry for progress of a pre-mortem job.
 * Returns { status, progress, error? } from MiroFish.
 *
 * Enterprise-tier feature only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTierAtLeast } from "@/lib/guards";
import { withErrorHandling, UpstreamUnavailableError } from "@/lib/errors";

const MIROFISH_URL = process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) => {
    await requireTierAtLeast("enterprise");
    const { jobId } = await params;

    let resp: Response;
    try {
      resp = await fetch(
        `${MIROFISH_URL}/internal/v1/premortem/${encodeURIComponent(jobId)}/status`,
        {
          headers: { Authorization: `Bearer ${MIROFISH_TOKEN}` },
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (err) {
      throw new UpstreamUnavailableError("mirofish", err);
    }

    if (!resp.ok) {
      throw new UpstreamUnavailableError(
        "mirofish",
        new Error(`status endpoint returned ${resp.status}`),
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  },
);
