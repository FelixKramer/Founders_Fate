import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireAdminOrSupport } from "@/lib/guards";

const MIROFISH_URL =
  process.env.MIROFISH_BASE_URL ?? process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_INTERNAL_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

export const GET = withErrorHandling(async () => {
  await requireAdminOrSupport();

  const res = await fetch(`${MIROFISH_URL}/internal/v1/fidelity`, {
    headers: {
      Authorization: `Bearer ${MIROFISH_INTERNAL_TOKEN}`,
    },
    signal: AbortSignal.timeout(10_000),
    // Never cache — always get the latest result.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: "mirofish_error", detail: body },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
});
