import { NextRequest, NextResponse } from 'next/server'
import { makeAdminClient } from '@/lib/supabaseAdmin'
import {
  enforceSandboxCap,
  provisionDemoSandbox,
  sweepExpiredSandboxes,
} from '@/lib/demo/provision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Provisions a throwaway demo sandbox and hands back its login. Called by the
 * public /demo page, so it is deliberately unauthenticated — the returned
 * account owns nothing but its own seeded data and is deleted after 24 hours.
 */

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 8

/** Per-instance throttle. Not exact across serverless instances, but enough
 *  to keep a single visitor from minting sandboxes in a loop. */
const recentByIp = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hits = (recentByIp.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  hits.push(now)
  recentByIp.set(ip, hits)

  // Keep the map from growing without bound on a long-lived instance.
  if (recentByIp.size > 5000) {
    recentByIp.forEach((times, key) => {
      if (times.every(time => now - time >= WINDOW_MS)) recentByIp.delete(key)
    })
  }

  return hits.length > MAX_PER_WINDOW
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  if (process.env.DEMO_ENABLED === 'false') {
    return NextResponse.json({ error: 'Demo is disabled.' }, { status: 404 })
  }

  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: 'Too many demo sessions from this address. Try again later.' },
      { status: 429 }
    )
  }

  let admin
  try {
    admin = makeAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'Server is not configured.' },
      { status: 500 }
    )
  }

  // Reclaim what expired before adding another sandbox. Failures here must not
  // stop a visitor from getting their demo.
  try {
    await sweepExpiredSandboxes(admin)
    await enforceSandboxCap(admin)
  } catch (error) {
    console.error('Demo cleanup failed:', error)
  }

  try {
    const demo = await provisionDemoSandbox(admin)
    return NextResponse.json({
      email: demo.email,
      password: demo.password,
      slug: demo.slug,
      expiresAt: demo.expiresAt,
    })
  } catch (error) {
    console.error('Demo provisioning failed:', error)
    return NextResponse.json(
      { error: 'Could not start the demo. Please try again.' },
      { status: 500 }
    )
  }
}
