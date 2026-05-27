/**
 * POST /api/waitlist
 * Body: { email: string, archetype?: string, why?: string }
 *
 * Stores the signup as an AnalyticsEvent and sends a confirmation email.
 * No auth required — publicly accessible.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withErrorHandling, ValidationError } from '@/lib/errors'
import { sendWaitlistConfirmationEmail } from '@/lib/email'

const Body = z.object({
  email: z.string().email(),
  archetype: z.string().optional(),
  why: z.string().max(500).optional(),
})

export const POST = withErrorHandling(async (req: Request) => {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) throw new ValidationError('Invalid email address')

  const { email, archetype, why } = parsed.data

  // Store in AnalyticsEvent table — no dedicated waitlist table needed for alpha
  await db.analyticsEvent
    .create({
      data: {
        name: 'waitlist_signup',
        props: { email, archetype: archetype ?? null, why: why ?? null },
      },
    })
    .catch(() => null) // fail silently — don't block the user

  // Send confirmation via Resend
  await sendWaitlistConfirmationEmail(email).catch(() => null)

  return NextResponse.json({ ok: true, message: "You're on the list!" })
})
