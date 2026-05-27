/**
 * GET /api/premortem/[jobId]/pdf
 *
 * Streams the ReportLab-generated PDF from MiroFish back to the browser
 * as an attachment. MiroFish generates the PDF on first request and caches
 * it on disk for subsequent calls.
 *
 * Enterprise-tier feature only.
 */

import { NextRequest } from "next/server";
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
        `${MIROFISH_URL}/internal/v1/premortem/${encodeURIComponent(jobId)}/pdf`,
        {
          headers: { Authorization: `Bearer ${MIROFISH_TOKEN}` },
          signal: AbortSignal.timeout(30_000),
        },
      );
    } catch (err) {
      throw new UpstreamUnavailableError("mirofish", err);
    }

    if (!resp.ok) {
      throw new UpstreamUnavailableError(
        "mirofish",
        new Error(`pdf endpoint returned ${resp.status}`),
      );
    }

    const shortId = jobId.slice(0, 8);
    return new Response(resp.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="premortem-${shortId}.pdf"`,
      },
    });
  },
);
