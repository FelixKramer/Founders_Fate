/**
 * POST /api/feedback
 * Body: { rating: 'negative'|'neutral'|'positive', text?: string }
 *
 * Auth: optional — accepts feedback from both signed-in and anonymous users.
 * Stores in AnalyticsEvent table. If LINEAR_WEBHOOK_URL env is set, also
 * POSTs to that webhook so the team sees feedback in Linear.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withErrorHandling, ValidationError } from '@/lib/errors'
import { optionalSession } from '@/lib/guards'

const Body = z.object({
  rating: z.enum(['negative', 'neutral', 'positive']),
  text: z.string().max(300).optional(),
})

export const POST = withErrorHandling(async (req: Request) => {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) throw new ValidationError('Invalid feedback payload')

  const { rating, text } = parsed.data
  const session = await optionalSession()
  const userId = session?.id ?? null

  // Store in AnalyticsEvent
  await db.analyticsEvent.create({
    data: {
      name: 'feedback',
      props: {
        rating,
        text: text ?? null,
        userId,
      },
      ...(userId ? { userId } : {}),
    },
  })

  // Forward to Linear webhook if configured
  const linearWebhookUrl = process.env.LINEAR_WEBHOOK_URL
  if (linearWebhookUrl) {
    const emoji = rating === 'positive' ? '😊' : rating === 'neutral' ? '😐' : '😤'
    const body = {
      text: `${emoji} **Alpha feedback** (${rating})${userId ? ` — user ${userId}` : ' — anonymous'}\n${text ? `\n> ${text}` : '_No additional text._'}`,
    }
    await fetch(linearWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((err) => {
      console.error('[feedback] Linear webhook failed:', err)
    })
  }

  return NextResponse.json({ ok: true })
})
