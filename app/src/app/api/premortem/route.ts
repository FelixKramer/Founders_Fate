/**
 * POST /api/premortem
 *
 * Starts an enterprise pre-mortem analysis from an uploaded document
 * (PDF/DOCX) or a URL. Proxies multipart form data to the MiroFish
 * parse-and-run endpoint, then fires analytics.
 *
 * Enterprise-tier feature only.
 *
 * Auth: requireTierAtLeast('enterprise')
 * Body: multipart/form-data — file (PDF|DOCX) OR url (string), plus scenario_name
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTierAtLeast } from "@/lib/guards";
import { withErrorHandling, UpstreamUnavailableError } from "@/lib/errors";
import { track } from "@/lib/analytics";

const MIROFISH_URL = process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Auth + tier gate (enterprise only)
  const user = await requireTierAtLeast("enterprise");

  // Forward multipart form data directly to MiroFish
  const formData = await req.formData();
  formData.set("user_id", user.id);

  let mfRes: Response;
  try {
    mfRes = await fetch(`${MIROFISH_URL}/internal/v1/premortem/parse-and-run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MIROFISH_TOKEN}` },
      body: formData,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new UpstreamUnavailableError("mirofish", err);
  }

  if (!mfRes.ok) {
    throw new UpstreamUnavailableError(
      "mirofish",
      new Error(`premortem parse-and-run returned ${mfRes.status}`),
    );
  }

  const data = (await mfRes.json()) as { job_id: string; status: string };

  void track(
    "fate_premortem_run",
    { simulation_id: data.job_id, perspective: "enterprise" },
    { userId: user.id },
  );

  return NextResponse.json(data, { status: 202 });
});
