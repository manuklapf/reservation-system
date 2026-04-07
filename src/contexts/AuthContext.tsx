'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  tenantId: string | null
  setTenantId: (id: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserTenant(session.user.email!)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserTenant(session.user.email!)
      } else {
        setTenantId(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserTenant = async (email: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('tenant_id')
        .eq('email', email)
        .single()

      if (error) {
        // Check if it's a "no rows" error (user not in staff table)
        if (error.code === 'PGRST116') {
          console.warn(
            `User ${email} not found in staff table. Please add them to access the system.`
          )
        } else {
          console.error('Error fetching tenant for user:', error)
        }
        return
      }

      if (data?.tenant_id) {
        setTenantId(data.tenant_id)
      } else {
        console.warn(
          `User ${email} found in staff table but has no tenant_id assigned.`
        )
      }
    } catch (error) {
      console.error('Unexpected error fetching user tenant:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error: new Error(
          'Supabase client not initialized. Please check your environment variables.'
        ),
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    if (!supabase) return

    await supabase.auth.signOut()
    setTenantId(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        tenantId,
        setTenantId,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
