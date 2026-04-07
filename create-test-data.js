// Create demo table data for the reservation system
// Run with: node create-test-data.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables!')
  console.error(
    'Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createTestData() {
  try {
    console.log('Seeding test tables...')

    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'demo-restaurant')
      .limit(1)

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError)
      return
    }

    if (!tenants || tenants.length === 0) {
      console.error('Tenant not found: demo-restaurant')
      console.error('Run node create-test-user.js first.')
      return
    }

    const tenant = tenants[0]

    const testTables = [
      {
        tenant_id: tenant.id,
        table_identifier: 'Table 1',
        capacity: 2,
        is_active: true,
      },
      {
        tenant_id: tenant.id,
        table_identifier: 'Table 2',
        capacity: 4,
        is_active: true,
      },
      {
        tenant_id: tenant.id,
        table_identifier: 'Table 3',
        capacity: 4,
        is_active: true,
      },
      {
        tenant_id: tenant.id,
        table_identifier: 'Table 4',
        capacity: 6,
        is_active: true,
      },
      {
        tenant_id: tenant.id,
        table_identifier: 'Patio 1',
        capacity: 8,
        is_active: true,
      },
    ]

    const { data, error } = await supabase
      .from('tables')
      .upsert(testTables, { onConflict: 'tenant_id,table_identifier' })
      .select('id, table_identifier, capacity, is_active')
      .order('table_identifier', { ascending: true })

    if (error) {
      if (
        error.message &&
        error.message.includes('relation "public.tables" does not exist')
      ) {
        console.error('The tables table does not exist yet.')
        console.error(
          'Run supabase-tables-schema.sql in Supabase SQL Editor first.'
        )
        return
      }

      console.error('Error creating test tables:', error)
      return
    }

    console.log(`Created or updated ${data.length} tables for ${tenant.name}:`)
    for (const table of data) {
      console.log(`- ${table.table_identifier} (seats ${table.capacity})`)
    }

    console.log('\nDone. You can now create reservations in the modal.')
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

createTestData()
