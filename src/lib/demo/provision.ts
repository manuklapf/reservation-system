import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlacedTable } from '@/components/floor-plan/types'
import {
  DEMO_FLOORS,
  DEMO_RESTAURANT_NAME,
  DEMO_STAFF,
  tableColor,
} from './blueprint'
import { buildDemoReservations } from './seed'

/**
 * Provisioning and teardown of demo sandboxes.
 *
 * Each visitor of /demo gets a tenant of their own so nobody sees anyone
 * else's edits. The sandbox is a completely normal tenant — same tables, same
 * RLS, same everything — except it is flagged `is_demo` and carries a deletion
 * deadline. Deleting the tenant cascades to staff, tables, floor plans and
 * reservations, so the reset is a single row delete plus the auth user.
 */

/** How long a sandbox lives before everything in it is reset. */
export const DEMO_LIFETIME_MS = 24 * 60 * 60 * 1000

/** Hard ceiling on concurrent sandboxes; the oldest are evicted beyond it. */
export const MAX_ACTIVE_DEMOS = 300

const RESERVATION_CHUNK = 250

export interface DemoCredentials {
  tenantId: string
  slug: string
  email: string
  password: string
  expiresAt: string
}

function randomId(): string {
  return randomBytes(5).toString('hex')
}

function randomPassword(): string {
  return randomBytes(18).toString('base64url')
}

/** Demo logins live on example.com so no address can ever reach a real inbox. */
function staffEmail(name: string, id: string): string {
  const handle = name
    .split(' ')[0]
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return `${handle}-${id}@example.com`
}

/** True when the tenant is a throwaway demo sandbox rather than a real account. */
export async function isDemoTenant(
  admin: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  const { data } = await admin
    .from('tenants')
    .select('is_demo')
    .eq('id', tenantId)
    .single()
  return data?.is_demo === true
}

/** Deletes a sandbox and its login. Safe to call on a partially built one. */
export async function deleteSandbox(
  admin: SupabaseClient,
  tenantId: string,
  userId: string | null | undefined
): Promise<void> {
  // Tenant first: reservations reference auth.users via created_by, so the
  // auth user can only go once the cascade has removed them.
  await admin.from('tenants').delete().eq('id', tenantId)
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined)
  }
}

/**
 * Creates a fresh sandbox: tenant, login, team, two floors with their tables,
 * and a full reservation book generated around the current date.
 */
export async function provisionDemoSandbox(
  admin: SupabaseClient,
  now: Date = new Date()
): Promise<DemoCredentials> {
  const id = randomId()
  const slug = `demo-${id}`
  const email = `demo-${id}@example.com`
  const password = randomPassword()
  const expiresAt = new Date(now.getTime() + DEMO_LIFETIME_MS).toISOString()

  // 1. Tenant. Demo accounts are 'active' so no trial banner or paywall gets
  //    in the way of trying the product out.
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({
      name: DEMO_RESTAURANT_NAME,
      slug,
      plan_status: 'active',
      trial_ends_at: null,
      is_demo: true,
      demo_expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? 'Could not create demo tenant')
  }

  const tenantId = tenant.id as string
  let userId: string | null = null

  try {
    // 2. The login the visitor is dropped into.
    const { data: created, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { demo: true, demo_tenant_id: tenantId },
      })
    if (authError || !created.user) {
      throw new Error(authError?.message ?? 'Could not create demo login')
    }
    userId = created.user.id

    await admin
      .from('tenants')
      .update({ demo_user_id: userId })
      .eq('id', tenantId)

    // 3. The team. Only the owner has a login; the rest are staff records the
    //    visitor can edit, exactly like a real account's team page.
    const { error: staffError } = await admin.from('staff').insert(
      DEMO_STAFF.map((member, index) => ({
        tenant_id: tenantId,
        email: index === 0 ? email : staffEmail(member.name, id),
        name: member.name,
        role: member.role,
      }))
    )
    if (staffError) throw new Error(staffError.message)

    // 4. Floors, initially without a layout — the layout needs the table ids.
    const { data: floors, error: floorError } = await admin
      .from('floor_plans')
      .insert(
        DEMO_FLOORS.map(floor => ({
          tenant_id: tenantId,
          name: floor.name,
          layout: [],
          obstacles: floor.obstacles,
          sort_order: floor.sortOrder,
        }))
      )
      .select('id, name')
    if (floorError || !floors) {
      throw new Error(floorError?.message ?? 'Could not create floor plans')
    }

    const floorIdByKey = new Map<string, string>()
    for (const blueprint of DEMO_FLOORS) {
      const match = floors.find(f => f.name === blueprint.name)
      if (!match) throw new Error(`Floor ${blueprint.name} was not created`)
      floorIdByKey.set(blueprint.key, match.id as string)
    }

    // 5. Tables.
    const { data: tables, error: tableError } = await admin
      .from('tables')
      .insert(
        DEMO_FLOORS.flatMap(floor =>
          floor.tables.map(t => ({
            tenant_id: tenantId,
            floor_id: floorIdByKey.get(floor.key),
            table_identifier: t.identifier,
            capacity: t.capacity,
            is_active: true,
            color: tableColor(t.capacity),
          }))
        )
      )
      .select('id, floor_id, table_identifier')
    if (tableError || !tables) {
      throw new Error(tableError?.message ?? 'Could not create tables')
    }

    const tableIdByKey = new Map<string, string>()
    for (const floor of DEMO_FLOORS) {
      const floorId = floorIdByKey.get(floor.key)
      for (const t of floor.tables) {
        const row = tables.find(
          r => r.floor_id === floorId && r.table_identifier === t.identifier
        )
        if (!row) throw new Error(`Table ${t.identifier} was not created`)
        tableIdByKey.set(t.key, row.id as string)
      }
    }

    // 6. Now that the tables exist, place them on their floor.
    for (const floor of DEMO_FLOORS) {
      const layout: PlacedTable[] = floor.tables.map(t => ({
        id: tableIdByKey.get(t.key)!,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        shape: t.shape,
        color: tableColor(t.capacity),
      }))
      const { error } = await admin
        .from('floor_plans')
        .update({ layout })
        .eq('id', floorIdByKey.get(floor.key))
      if (error) throw new Error(error.message)
    }

    // 7. The reservation book, generated around today.
    const rows = buildDemoReservations(now).map(r => {
      const ids = r.tableKeys.map(key => tableIdByKey.get(key)!)
      const identifiers = r.tableKeys.map(
        key =>
          DEMO_FLOORS.flatMap(f => f.tables).find(t => t.key === key)!
            .identifier
      )
      const pending = r.is_requested && !r.approved_by
      return {
        tenant_id: tenantId,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        customer_email: r.customer_email,
        date: r.date,
        time: r.time,
        end_time: r.end_time,
        party_size: r.party_size,
        notes: r.notes,
        status: pending ? 'pending' : 'confirmed',
        table_id: ids[0] ?? null,
        table_ids: ids,
        table_identifiers: identifiers,
        is_requested: r.is_requested,
        approved_by: r.approved_by,
        // Guest requests come in without a staff author, everything else was
        // entered by the team — which the demo login stands in for.
        created_by: pending ? null : userId,
      }
    })

    for (let i = 0; i < rows.length; i += RESERVATION_CHUNK) {
      const { error } = await admin
        .from('reservations')
        .insert(rows.slice(i, i + RESERVATION_CHUNK))
      if (error) throw new Error(error.message)
    }

    return { tenantId, slug, email, password, expiresAt }
  } catch (error) {
    // Never leave a half-built sandbox behind.
    await deleteSandbox(admin, tenantId, userId)
    throw error
  }
}

/** Deletes sandboxes whose 24 hours are up. Best effort, bounded per call. */
export async function sweepExpiredSandboxes(
  admin: SupabaseClient,
  limit = 25
): Promise<number> {
  const { data: expired } = await admin
    .from('tenants')
    .select('id, demo_user_id')
    .eq('is_demo', true)
    .lt('demo_expires_at', new Date().toISOString())
    .limit(limit)

  for (const tenant of expired ?? []) {
    await deleteSandbox(admin, tenant.id, tenant.demo_user_id)
  }

  return expired?.length ?? 0
}

/** Evicts the oldest sandboxes once too many are alive at the same time. */
export async function enforceSandboxCap(
  admin: SupabaseClient,
  max = MAX_ACTIVE_DEMOS
): Promise<number> {
  const { count } = await admin
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('is_demo', true)

  const surplus = (count ?? 0) - max
  if (surplus <= 0) return 0

  const { data: oldest } = await admin
    .from('tenants')
    .select('id, demo_user_id')
    .eq('is_demo', true)
    .order('demo_expires_at', { ascending: true })
    .limit(surplus)

  for (const tenant of oldest ?? []) {
    await deleteSandbox(admin, tenant.id, tenant.demo_user_id)
  }

  return oldest?.length ?? 0
}

/**
 * Deletes auth users left over from demo sandboxes that no longer exist —
 * the owner login of a sandbox removed outside the normal sweep, plus any
 * extra staff logins a visitor created while trying the team settings out.
 */
export async function sweepOrphanDemoUsers(
  admin: SupabaseClient
): Promise<number> {
  const { data: liveTenants } = await admin
    .from('tenants')
    .select('id')
    .eq('is_demo', true)
  const live = new Set((liveTenants ?? []).map(t => t.id as string))

  let page = 1
  let removed = 0
  const perPage = 200

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break

    for (const user of data.users) {
      const meta = user.user_metadata as
        | { demo?: boolean; demo_tenant_id?: string }
        | undefined
      if (!meta?.demo) continue
      if (meta.demo_tenant_id && live.has(meta.demo_tenant_id)) continue
      await admin.auth.admin.deleteUser(user.id).catch(() => undefined)
      removed++
    }

    if (data.users.length < perPage) break
    page++
  }

  return removed
}
