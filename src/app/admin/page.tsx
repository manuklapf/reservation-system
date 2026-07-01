'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/contexts/I18nContext'
import { Building2, LogOut, Plus, Users } from 'lucide-react'

type Tenant = {
  id: string
  name: string
  slug: string
  created_at: string
  staffCount: number
}

async function getToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function PlatformAdminPage() {
  const { user, loading, isPlatformAdmin, signOut } = useAuth()
  const router = useRouter()
  const { messages } = useI18n()
  const t = messages.platformAdmin

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadError, setLoadError] = useState('')
  const [fetching, setFetching] = useState(true)

  const [restaurantName, setRestaurantName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
    if (!loading && user && !isPlatformAdmin) router.push('/dashboard')
  }, [user, loading, isPlatformAdmin, router])

  const fetchTenants = async () => {
    setFetching(true)
    setLoadError('')
    const token = await getToken()
    const res = await fetch('/api/admin/tenants', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setLoadError(t.errorLoad)
    } else {
      setTenants(await res.json())
    }
    setFetching(false)
  }

  useEffect(() => {
    if (isPlatformAdmin) fetchTenants()
  }, [isPlatformAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNameChange = (val: string) => {
    setRestaurantName(val)
    if (!slugManual) setSlug(slugify(val))
  }

  const handleSlugChange = (val: string) => {
    setSlugManual(true)
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    const token = await getToken()
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ restaurantName, slug, adminName, adminEmail, adminPassword }),
    })
    const data = await res.json()
    if (!res.ok) {
      setAddError(data.error ?? t.errorAdd)
    } else {
      setTenants(prev => [...prev, data])
      setRestaurantName('')
      setSlug('')
      setSlugManual(false)
      setAdminName('')
      setAdminEmail('')
      setAdminPassword('')
      setShowForm(false)
    }
    setAdding(false)
  }

  if (loading || !user || !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">{messages.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 text-blue-600">
              <Building2 className="h-5 w-5" />
              <h1 className="text-lg font-semibold">{t.title}</h1>
            </div>
            <button
              onClick={async () => { await signOut(); router.push('/') }}
              className="text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">{t.restaurants}</h2>
          <button
            type="button"
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t.addRestaurant}
          </button>
        </div>

        {/* Create restaurant form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">{t.addRestaurant}</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.restaurantName}
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder={t.restaurantNamePlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.slug}
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    placeholder={t.slugPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t.slugHint}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                  Initial admin account
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t.adminName}
                    </label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      placeholder={t.adminNamePlaceholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t.adminEmail}
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      placeholder={t.adminEmailPlaceholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.adminPassword}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder={t.adminPasswordPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {addError && <p className="text-xs text-red-500">{addError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {messages.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {adding ? t.adding : t.addButton}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Restaurant list */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {fetching ? (
            <p className="p-6 text-sm text-gray-400">{messages.common.loading}</p>
          ) : loadError ? (
            <p className="p-6 text-sm text-red-500">{loadError}</p>
          ) : tenants.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">{t.noRestaurants}</p>
          ) : (
            tenants.map(tenant => (
              <div key={tenant.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{tenant.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">/{tenant.slug}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {tenant.staffCount} {t.staffCount}
                  </span>
                  <span>
                    {t.createdAt} {new Date(tenant.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
