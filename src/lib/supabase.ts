import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if environment variables are provided
export const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : null

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
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
