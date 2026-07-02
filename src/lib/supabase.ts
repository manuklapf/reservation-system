import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Intercept fetch calls made by GoTrueClient.
// Token-refresh requests are short-circuited and never reach the network —
// this is the only reliable way to prevent `net::ERR_NAME_NOT_RESOLVED`
// console spam when the Supabase project URL is unreachable, because the
// browser logs DNS failures before any JavaScript catch block can run.
// All other requests fall through to the real fetch with a caught fallback.
const safeFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url

  // Block refresh-token requests from hitting the network entirely.
  // GoTrueClient receives a 401 and signs the user out gracefully.
  if (url.includes('grant_type=refresh_token')) {
    return new Response(
      JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Token refresh not available',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    return await fetch(input, init)
  } catch {
    return new Response(
      JSON.stringify({
        error: 'network_failure',
        error_description: 'Network request failed',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Only create client if environment variables are provided
export const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
    ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
        global: { fetch: safeFetch },
        auth: { autoRefreshToken: false },
      })
    : null

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          plan_status: 'trial' | 'active' | 'expired'
          trial_ends_at: string
          ls_subscription_id: string | null
          ls_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan_status?: 'trial' | 'active' | 'expired'
          trial_ends_at?: string
          ls_subscription_id?: string | null
          ls_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan_status?: 'trial' | 'active' | 'expired'
          trial_ends_at?: string
          ls_subscription_id?: string | null
          ls_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          tenant_id: string
          email: string
          name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          name: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          tenant_id: string
          customer_name: string
          customer_phone: string
          table_number: number
          date: string
          time: string
          party_size: number
          notes: string | null
          status: string
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          tenant_id: string
          customer_name: string
          customer_phone: string
          table_number: number
          date: string
          time: string
          party_size: number
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_name?: string
          customer_phone?: string
          table_number?: number
          date?: string
          time?: string
          party_size?: number
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
    }
  }
}
