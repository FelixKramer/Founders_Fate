import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireAdminOrSupport } from "@/lib/guards";
import { db } from "@/lib/db";

const DEFAULT_FLAGS = [
  { key: "marketplace_enabled", enabled: false, description: "Enable the scenario marketplace" },
  { key: "premortem_enabled", enabled: true, description: "Enable pre-mortem analysis feature" },
  { key: "custom_models_enabled", enabled: false, description: "Allow users to select custom LLM models" },
  { key: "signups_open", enabled: true, description: "Allow new user registrations" },
  { key: "llm_mock_mode", enabled: false, description: "Use mock LLM responses instead of real API calls" },
];

export const GET = withErrorHandling(async () => {
  await requireAdminOrSupport();

  // Ensure defaults exist
  await Promise.all(
    DEFAULT_FLAGS.map((f) =>
      db.featureFlag.upsert({
        where: { key: f.key },
        update: {},
        create: { key: f.key, enabled: f.enabled, description: f.description },
      })
    )
  );

  const flags = await db.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ flags });
});
