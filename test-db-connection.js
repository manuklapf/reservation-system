// Simple test script to check database connection and data
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set')
console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not set')

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  async function testConnection() {
    try {
      // Test connection and check data
      console.log('\nTesting database connection...')
      
      // Check tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
      
      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError)
      } else {
        console.log('Tenants found:', tenants.length)
        tenants.forEach(tenant => {
          console.log(`- ${tenant.name} (${tenant.slug})`)
        })
      }
      
      // Check staff
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
      
      if (staffError) {
        console.error('Error fetching staff:', staffError)
      } else {
        console.log('\nStaff found:', staff.length)
        staff.forEach(s => {
          console.log(`- ${s.name} (${s.email}) - Tenant: ${s.tenant_id}`)
        })
      }
      
      // Check reservations
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
      
      if (reservationsError) {
        console.error('Error fetching reservations:', reservationsError)
      } else {
        console.log('\nReservations found:', reservations.length)
      }
      
    } catch (error) {
      console.error('Connection test failed:', error)
    }
  }
  
  testConnection()
} else {
  console.log('Missing environment variables!')
}