/**
 * Health check endpoint for uptime monitoring.
 * Used by BetterStack / status page.
 *
 * GET /api/health
 * Returns 200 with service info when healthy, 503 when DB is unreachable.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  try {
    // Quick DB ping
    await db.$queryRaw`SELECT 1`
    const dbLatencyMs = Date.now() - start

    return NextResponse.json({
      ok: true,
      service: 'founderfate-app',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      dbLatencyMs,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Database unreachable' },
      { status: 503 }
    )
  }
}
