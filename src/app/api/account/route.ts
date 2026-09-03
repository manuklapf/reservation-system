import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { makeAdminClient } from '@/lib/supabaseAdmin'
import { isDemoTenant } from '@/lib/demo/provision'

// Self-service account updates for the signed-in user: display name, email,
// and password. Email/password changes require re-entering the current
// password. Email changes also rewrite the staff row (the app keys staff by
// email) and the marketing site's subscription record.
//
// Demo sandboxes are excluded: a throwaway login must stay throwaway.

export async function PATCH(req: NextRequest) {
  let admin
  try {
    admin = makeAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'Server is not configured.' },
      { status: 500 }
    )
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const {
    data: { user },
    error: authErr,
  } = await admin.auth.getUser(token)
  if (authErr || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = user.email

  // A visitor who could put their own address and password on a demo login
  // would walk away with a working account, so nothing here is editable in a
  // sandbox. The user metadata is checked as well as the tenant flag: staff
  // logins created inside a sandbox carry it even before the staff row is read.
  const demoUser =
    (user.user_metadata as { demo?: boolean } | null)?.demo === true
  const { data: staffRow } = await admin
    .from('staff')
    .select('tenant_id')
    .eq('email', email)
    .maybeSingle()
  if (
    demoUser ||
    (staffRow?.tenant_id && (await isDemoTenant(admin, staffRow.tenant_id)))
  ) {
    return NextResponse.json(
      { error: 'Account settings are disabled in the demo.' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const newEmail =
    typeof body?.newEmail === 'string'
      ? body.newEmail.trim().toLowerCase()
      : undefined
  const newPassword =
    typeof body?.newPassword === 'string' ? body.newPassword : undefined
  const currentPassword =
    typeof body?.currentPassword === 'string' ? body.currentPassword : undefined

  if (name === undefined && !newEmail && !newPassword) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  // Credential changes must prove possession of the current password.
  if (newEmail || newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'currentPassword is required.' },
        { status: 400 }
      )
    }
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error: pwErr } = await anon.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (pwErr) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 403 }
      )
    }
  }

  if (name !== undefined) {
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'Invalid name.' }, { status: 400 })
    }
    const { error } = await admin
      .from('staff')
      .update({ name })
      .eq('email', email)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (newEmail && newEmail !== email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 }
      )
    }
    const { data: taken } = await admin
      .from('staff')
      .select('id')
      .eq('email', newEmail)
      .maybeSingle()
    if (taken) {
      return NextResponse.json(
        { error: 'That email is already in use.' },
        { status: 409 }
      )
    }

    const { error: emailErr } = await admin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    })
    if (emailErr) {
      return NextResponse.json({ error: emailErr.message }, { status: 500 })
    }

    // Keep the app's staff record in sync — logins resolve tenant by email.
    const { error: staffErr } = await admin
      .from('staff')
      .update({ email: newEmail })
      .eq('email', email)
    if (staffErr) {
      // Roll back the auth email so login and staff lookup stay consistent.
      await admin.auth.admin.updateUserById(user.id, {
        email,
        email_confirm: true,
      })
      return NextResponse.json({ error: staffErr.message }, { status: 500 })
    }

    // Best effort: the marketing site's subscriptions table mirrors the email.
    await admin
      .from('subscriptions')
      .update({ user_email: newEmail })
      .eq('user_id', user.id)

    // The current session token still carries the old email; the client signs
    // the user out so they log back in with the new address.
    return NextResponse.json({ ok: true, emailChanged: true })
  }

  return NextResponse.json({ ok: true })
}
