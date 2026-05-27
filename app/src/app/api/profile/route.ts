/**
 * POST /api/profile  — upsert profile after onboarding
 * GET  /api/profile  — fetch current user's profile
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling, ValidationError } from "@/lib/errors";

const VALID_ARCHETYPES = [
  "b2b_saas",
  "b2c",
  "marketplace",
  "hardware",
  "solo",
] as const;

const ProfilePostSchema = z.object({
  archetype: z.enum(VALID_ARCHETYPES).optional(),
  answers: z
    .array(z.number().int().min(1).max(5))
    .length(5)
    .optional(),
  displayName: z.string().min(1).max(80).optional(),
  timezone: z.string().max(100).optional(),
  allowBenchmark: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireSession();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  const parsed = ProfilePostSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const {
    archetype,
    answers,
    displayName,
    timezone,
    allowBenchmark,
    marketingEmails,
  } = parsed.data;

  // Determine if this POST completes onboarding (archetype + answers both provided)
  const completesOnboarding = Boolean(archetype && answers);

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...(archetype ? { archetype } : {}),
      ...(answers ? { answers: JSON.stringify(answers) } : {}),
      ...(displayName ? { displayName } : {}),
      ...(timezone ? { timezone } : {}),
      ...(allowBenchmark !== undefined ? { allowBenchmark } : {}),
      ...(marketingEmails !== undefined ? { marketingEmails } : {}),
      onboardingCompleted: completesOnboarding,
    },
    update: {
      ...(archetype ? { archetype } : {}),
      ...(answers ? { answers: JSON.stringify(answers) } : {}),
      ...(displayName !== undefined ? { displayName } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
      ...(allowBenchmark !== undefined ? { allowBenchmark } : {}),
      ...(marketingEmails !== undefined ? { marketingEmails } : {}),
      ...(completesOnboarding ? { onboardingCompleted: true } : {}),
      lastActiveAt: new Date(),
    },
  });

  const response = NextResponse.json({ ok: true });

  if (completesOnboarding) {
    // Set the onboarding-complete cookie so middleware doesn't redirect to /onboarding
    const ONE_YEAR = 60 * 60 * 24 * 365;
    response.headers.set(
      "Set-Cookie",
      `ff_onboarding_done=1; Path=/; SameSite=Lax; Max-Age=${ONE_YEAR}`,
    );
  }

  return response;
});

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withErrorHandling(async () => {
  const user = await requireSession();

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      archetype: true,
      displayName: true,
      tier: true,
      simulationCount: true,
      dnaReportAvailable: true,
      onboardingCompleted: true,
      answers: true,
      timezone: true,
      allowBenchmark: true,
      marketingEmails: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    profile: profile
      ? {
          ...profile,
          answers: profile.answers ? JSON.parse(profile.answers) : null,
        }
      : null,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      tier: user.tier,
    },
  });
});
