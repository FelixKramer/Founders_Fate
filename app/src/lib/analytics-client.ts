/**
 * Browser-side counterpart to analytics.ts. Same EventMap type;
 * dispatches via the Amplitude browser SDK and POSTs to /api/internal/event
 * so the server can mirror to the AnalyticsEvent table even when the
 * event originated on the client.
 */

"use client";

import type { EventMap, EventName } from "@/lib/analytics";

let initialised = false;
async function init(): Promise<void> {
  if (initialised) return;
  initialised = true;
  if (!process.env.NEXT_PUBLIC_AMPLITUDE_KEY) return;
  try {
    const mod = await import("@amplitude/analytics-browser");
    mod.init(process.env.NEXT_PUBLIC_AMPLITUDE_KEY!, undefined, {
      defaultTracking: { pageViews: true, sessions: true },
    });
  } catch {
    // Package not installed yet — silently degrade.
  }
}

export async function trackClient<E extends EventName>(
  name: E,
  props: EventMap[E],
): Promise<void> {
  // Fire to Amplitude.
  await init();
  if (process.env.NEXT_PUBLIC_AMPLITUDE_KEY) {
    try {
      const mod = await import("@amplitude/analytics-browser");
      mod.track(name, props as Record<string, unknown>);
    } catch {
      // ignore
    }
  }

  // Mirror to server (and thus to AnalyticsEvent table).
  // Best-effort; use sendBeacon when available so it survives page unload.
  const body = JSON.stringify({ name, props });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        "/api/internal/event",
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    }
    await fetch("/api/internal/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // ignore
  }
}
