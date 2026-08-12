import { NextRequest, NextResponse } from 'next/server'
import { makeAdminClient } from '@/lib/supabaseAdmin'
import {
  sweepExpiredSandboxes,
  sweepOrphanDemoUsers,
} from '@/lib/demo/provision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Scheduled reset of expired demo sandboxes (see vercel.json). Visiting /demo
 * also sweeps opportunistically, so this mainly covers quiet periods and
 * cleans up auth users left behind by sandboxes that are already gone.
 *
 * Authorized with CRON_SECRET, which Vercel Cron sends as a bearer token.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured.' },
      { status: 500 }
    )
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  // A sweep is bounded per call, so keep going while it keeps finding work.
  let sandboxes = 0
  for (let round = 0; round < 20; round++) {
    const deleted = await sweepExpiredSandboxes(admin, 25)
    sandboxes += deleted
    if (deleted < 25) break
  }

  const orphanUsers = await sweepOrphanDemoUsers(admin)

  return NextResponse.json({ sandboxes, orphanUsers })
}

export const GET = handle
export const POST = handle
