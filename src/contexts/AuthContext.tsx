'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import {
  getAccountState,
  type AccountState,
  type PlanStatus,
} from '@/lib/trial'

export type UserRole = 'platform_admin' | 'admin' | 'staff'

export interface DemoState {
  /** ISO timestamp at which the sandbox and all of its data are deleted. */
  expiresAt: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  tenantId: string | null
  setTenantId: (id: string) => void
  role: UserRole | null
  isAdmin: boolean
  isPlatformAdmin: boolean
  staffName: string | null
  /** Effective account state (trial / active / expired + access). Null until loaded. */
  account: AccountState | null
  planStatus: PlanStatus | null
  /** Set when signed into a throwaway demo sandbox; carries its reset deadline. */
  demo: DemoState | null
  trialDaysLeft: number
  accessLocked: boolean
  refreshAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [staffName, setStaffName] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountState | null>(null)
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null)
  const [demo, setDemo] = useState<DemoState | null>(null)

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
        setRole(null)
        setStaffName(null)
        setAccount(null)
        setPlanStatus(null)
        setDemo(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserTenant = async (email: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('tenant_id, role, name')
        .eq('email', email)
        .single()

      if (error) {
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

      const r = data?.role
      const fetchedRole: UserRole =
        r === 'platform_admin'
          ? 'platform_admin'
          : r === 'admin'
            ? 'admin'
            : 'staff'
      setRole(fetchedRole)
      setStaffName(data?.name ?? null)

      if (data?.tenant_id) {
        fetchAccount(data.tenant_id)
      }
    } catch (error) {
      console.error('Unexpected error fetching user tenant:', error)
    }
  }

  const fetchAccount = useCallback(async (id: string) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('tenants')
      .select('plan_status, trial_ends_at, is_demo, demo_expires_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      // Fail open: don't lock people out on a transient read error.
      setAccount(null)
      setPlanStatus(null)
      setDemo(null)
      return
    }

    setPlanStatus((data.plan_status as PlanStatus) ?? 'trial')
    setAccount(getAccountState(data))
    setDemo(
      data.is_demo && data.demo_expires_at
        ? { expiresAt: data.demo_expires_at as string }
        : null
    )
  }, [])

  const refreshAccount = useCallback(async () => {
    if (tenantId) await fetchAccount(tenantId)
  }, [tenantId, fetchAccount])

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
    setRole(null)
    setAccount(null)
    setPlanStatus(null)
    setDemo(null)
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
        role,
        isAdmin: role === 'admin',
        isPlatformAdmin: role === 'platform_admin',
        staffName,
        account,
        planStatus,
        demo,
        trialDaysLeft: account?.mode === 'trial' ? account.daysLeft : 0,
        accessLocked: account?.access === 'locked',
        refreshAccount,
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
