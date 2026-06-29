// Setup script to create staff record for authenticated user
// Run this with: node setup-staff-user.js <email> <name>

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

async function createStaffUser(email, name = 'Staff User') {
  try {
    console.log(`Creating staff record for: ${email}`)

    // Get the tenant (assuming we want to use the first/only tenant)
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1)

    if (tenantError || !tenants || tenants.length === 0) {
      console.error('No tenant found! Please run the main schema first.')
      return
    }

    const tenant = tenants[0]
    console.log(`Using tenant: ${tenant.name} (${tenant.id})`)

    // Check if staff record already exists
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single()

    if (existingStaff) {
      console.log('Staff record already exists:', existingStaff)
      return
    }

    // Create staff record
    const { data: newStaff, error: staffError } = await supabase
      .from('staff')
      .insert([
        {
          tenant_id: tenant.id,
          email: email,
          name: name,
          role: 'manager',
        },
      ])
      .select()
      .single()

    if (staffError) {
      console.error('Error creating staff record:', staffError)
      return
    }

    console.log('✅ Staff record created successfully!')
    console.log('Staff details:', newStaff)
    console.log(
      '\nNow you can log in with this email and the reservation modal should work!'
    )
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

// Get command line arguments
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage: node setup-staff-user.js <email> [name]')
  console.log('Example: node setup-staff-user.js admin@demo.com "Demo Admin"')
  process.exit(1)
}

const email = args[0]
const name = args[1] || 'Staff User'

createStaffUser(email, name)
