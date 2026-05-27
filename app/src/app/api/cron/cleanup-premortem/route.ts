/**
 * GET /api/cron/cleanup-premortem
 *
 * Vercel cron job (runs at 05:00 UTC every Sunday).
 * POSTs to MiroFish to trigger cleanup of pre-mortem data older than 2 years.
 * Handles gracefully if the MiroFish endpoint doesn't exist yet (404).
 *
 * Auth: Bearer CRON_SECRET
 * Returns: { ok: true, mirofish_response: ... }
 */

import { NextResponse } from "next/server";
import { withErrorHandling, ForbiddenError } from "@/lib/errors";

export const GET = withErrorHandling(async (request: Request) => {
  // Validate bearer token.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "");

  if (!cronSecret || !provided || provided !== cronSecret) {
    throw new ForbiddenError("cron_auth_required");
  }

  const miroFishUrl = process.env.MIROFISH_URL ?? "http://localhost:8000";
  const internalToken = process.env.MIROFISH_INTERNAL_TOKEN;

  let mirofishResponse: unknown = null;
  let mirofishStatus: number | null = null;

  try {
    const res = await fetch(
      `${miroFishUrl}/internal/v1/admin/cleanup-old-data`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(internalToken
            ? { authorization: `Bearer ${internalToken}` }
            : {}),
        },
        body: JSON.stringify({ older_than_days: 730, data_type: "premortem" }),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      },
    );

    mirofishStatus = res.status;

    if (res.status === 404) {
      // Endpoint not yet implemented in MiroFish — this is expected during
      // early development. Log and return gracefully.
      console.log(
        "[cron/cleanup-premortem] MiroFish cleanup endpoint not yet implemented (404) — skipping",
      );
      mirofishResponse = { skipped: true, reason: "endpoint_not_implemented" };
    } else if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[cron/cleanup-premortem] MiroFish returned ${res.status}: ${text}`,
      );
      mirofishResponse = { error: `upstream_error_${res.status}` };
    } else {
      mirofishResponse = await res.json().catch(() => ({ ok: true }));
      console.log("[cron/cleanup-premortem] MiroFish cleanup triggered", mirofishResponse);
    }
  } catch (err) {
    // Network errors, timeouts, etc. — log but don't crash the cron.
    console.error("[cron/cleanup-premortem] Failed to reach MiroFish:", err);
    mirofishResponse = {
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }

  return NextResponse.json({
    ok: true,
    mirofish_status: mirofishStatus,
    mirofish_response: mirofishResponse,
  });
});
