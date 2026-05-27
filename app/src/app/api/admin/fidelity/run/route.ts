import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireAdmin } from "@/lib/guards";

const MIROFISH_URL =
  process.env.MIROFISH_BASE_URL ?? process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_INTERNAL_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

export const POST = withErrorHandling(async () => {
  await requireAdmin();

  const res = await fetch(`${MIROFISH_URL}/internal/v1/fidelity/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MIROFISH_INTERNAL_TOKEN}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: "mirofish_error", detail: body },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 202 });
});
