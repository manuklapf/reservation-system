// Complete setup script to create auth user and staff record
// Run this with: node create-test-user.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables!')
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createTestUser() {
  try {
    const testEmail = 'admin@demo-restaurant.com'
    const testPassword = 'demo123456'
    const testName = 'Demo Admin'
    
    console.log('🚀 Setting up test user...')
    
    // Step 1: Get or create tenant
    console.log('1. Checking tenant...')
    let { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'demo-restaurant')
    
    if (tenantError) {
      console.error('Error fetching tenants:', tenantError)
      return
    }
    
    let tenant
    if (!tenants || tenants.length === 0) {
      console.log('Creating tenant...')
      const { data: newTenant, error: createTenantError } = await supabase
        .from('tenants')
        .insert([{
          name: 'Demo Restaurant',
          slug: 'demo-restaurant'
        }])
        .select()
        .single()
      
      if (createTenantError) {
        console.error('Error creating tenant:', createTenantError)
        return
      }
      tenant = newTenant
    } else {
      tenant = tenants[0]
    }
    
    console.log(`✅ Tenant ready: ${tenant.name} (${tenant.id})`)
    
    // Step 2: Create auth user
    console.log('2. Creating auth user...')
    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })
    
    if (authError) {
      // If user already exists, that's okay
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('✅ Auth user already exists')
        
        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) {
          console.error('Error listing users:', listError)
          return
        }
        
        const existingUser = users.find(u => u.email === testEmail)
        if (!existingUser) {
          console.error('Could not find existing user')
          return
        }
        
        console.log(`✅ Found existing user: ${existingUser.id}`)
      } else {
        console.error('Error creating auth user:', authError)
        return
      }
    } else {
      console.log(`✅ Auth user created: ${authResult.user.id}`)
    }
    
    // Step 3: Create staff record
    console.log('3. Creating staff record...')
    
    // Check if staff record already exists
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('*')
      .eq('email', testEmail)
      .single()
    
    if (existingStaff) {
      console.log('✅ Staff record already exists:', existingStaff.name)
    } else {
      const { data: newStaff, error: staffError } = await supabase
        .from('staff')
        .insert([{
          tenant_id: tenant.id,
          email: testEmail,
          name: testName,
          role: 'manager'
        }])
        .select()
        .single()
      
      if (staffError) {
        console.error('Error creating staff record:', staffError)
        return
      }
      
      console.log(`✅ Staff record created: ${newStaff.name}`)
    }
    
    // Step 4: Create sample reservations
    console.log('4. Creating sample reservations...')
    
    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenant.id)
    
    if (existingReservations && existingReservations.length > 0) {
      console.log(`✅ Sample reservations already exist (${existingReservations.length})`)
    } else {
      const sampleReservations = [
        {
          tenant_id: tenant.id,
          customer_name: 'John Smith',
          customer_phone: '(555) 123-4567',
          table_number: 1,
          date: new Date().toISOString().split('T')[0], // Today
          time: '18:00',
          party_size: 4,
          status: 'confirmed',
          notes: 'Birthday celebration'
        },
        {
          tenant_id: tenant.id,
          customer_name: 'Sarah Johnson',
          customer_phone: '(555) 987-6543',
          table_number: 3,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
          time: '19:30',
          party_size: 2,
          status: 'confirmed',
          notes: 'Anniversary dinner'
        }
      ]
      
      const { data: reservations, error: reservationError } = await supabase
        .from('reservations')
        .insert(sampleReservations)
        .select()
      
      if (reservationError) {
        console.error('Error creating sample reservations:', reservationError)
      } else {
        console.log(`✅ Created ${reservations.length} sample reservations`)
      }
    }
    
    console.log('\n🎉 Setup complete!')
    console.log('═══════════════════════════════════════')
    console.log('You can now log in with:')
    console.log(`Email: ${testEmail}`)
    console.log(`Password: ${testPassword}`)
    console.log('═══════════════════════════════════════')
    console.log('The reservation modal should now work properly!')
    
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

createTestUser()