// Smoke test for the public demo link.
//
// Usage (with the app running):
//   node setup/test-demo-sandbox.js                 # provision, verify, delete
//   node setup/test-demo-sandbox.js --keep          # leave the sandbox alive
//   APP_URL=https://your-app.vercel.app node setup/test-demo-sandbox.js
//
// Requires sql/demo-sandbox-migration.sql to have been applied.

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
const keep = process.argv.includes('--keep')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const columns = await supabase
    .from('tenants')
    .select('id, is_demo, demo_expires_at, demo_user_id')
    .limit(1)
  if (columns.error) {
    console.error(
      '✗ Demo columns missing. Run sql/demo-sandbox-migration.sql first.'
    )
    console.error('  ', columns.error.message)
    process.exit(1)
  }
  console.log('✓ demo columns present')

  console.log(`→ POST ${appUrl}/api/demo`)
  const res = await fetch(`${appUrl}/api/demo`, { method: 'POST' })
  const body = await res.json()
  if (!res.ok) {
    console.error('✗ Provisioning failed:', body.error ?? res.status)
    process.exit(1)
  }
  console.log('✓ sandbox provisioned:', body.slug, '| expires', body.expiresAt)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, plan_status, is_demo, demo_user_id')
    .eq('slug', body.slug)
    .single()

  const counts = {}
  for (const table of ['staff', 'tables', 'floor_plans', 'reservations']) {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
    counts[table] = count
  }

  const { count: pending } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('is_requested', true)
    .is('approved_by', null)

  const today = new Date().toISOString().slice(0, 10)
  const { count: upcoming } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .gte('date', today)

  console.log(`  tenant:        ${tenant.name} (plan ${tenant.plan_status})`)
  console.log(`  staff:         ${counts.staff}`)
  console.log(`  floors:        ${counts.floor_plans}`)
  console.log(`  tables:        ${counts.tables}`)
  console.log(
    `  reservations:  ${counts.reservations} (${upcoming} today or later)`
  )
  console.log(`  open requests: ${pending}`)
  console.log(`  login:         ${body.email} / ${body.password}`)
  console.log(`  widget:        ${appUrl}/${body.slug}/request`)

  const layouts = await supabase
    .from('floor_plans')
    .select('name, layout')
    .eq('tenant_id', tenant.id)
  const placed = layouts.data.reduce((sum, f) => sum + f.layout.length, 0)
  console.log(`  placed tables: ${placed} across ${layouts.data.length} floors`)

  if (keep) {
    console.log('\n… sandbox kept. It will be deleted automatically after 24h.')
    return
  }

  await supabase.from('tenants').delete().eq('id', tenant.id)
  if (tenant.demo_user_id) {
    await supabase.auth.admin.deleteUser(tenant.demo_user_id)
  }
  console.log(
    '\n✓ sandbox deleted again (pass --keep to try it in the browser)'
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
