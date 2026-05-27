"use client";

import { useEffect } from "react";
import { initAmplitude } from "@/lib/analytics-client";

/**
 * Thin client component that bootstraps the Amplitude browser SDK on mount.
 * Mount once in the root layout. No UI is rendered.
 */
export function AmplitudeBootstrap() {
  useEffect(() => {
    void initAmplitude();
  }, []);
  return null;
}
