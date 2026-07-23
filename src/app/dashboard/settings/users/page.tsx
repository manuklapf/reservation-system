'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Trash2, UserPlus } from '@/components/icons'
import { useI18n } from '@/contexts/I18nContext'
import Button from '@/components/Button'
import NavBar from '@/components/NavBar'

type StaffMember = {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff'
  created_at: string
}

async function getToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export default function StaffManagementPage() {
  const { user, isAdmin } = useAuth()
  const { messages } = useI18n()
  const t = messages.staffManagement
  const st = messages.settingsPage
  const setupT = messages.setupPage

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchStaff = async () => {
    setLoading(true)
    setLoadError('')
    const token = await getToken()
    const res = await fetch('/api/staff', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setLoadError(t.errorLoad)
    } else {
      setStaff(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user && isAdmin) fetchStaff()
  }, [user, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    const token = await getToken()
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, name, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setAddError(data.error ?? t.errorAdd)
    } else {
      setStaff(prev => [...prev, data])
      setName('')
      setEmail('')
      setPassword('')
    }
    setAdding(false)
  }

  const handleRemove = async (id: string) => {
    if (!confirm(t.confirmRemove)) return
    setRemovingId(id)
    const token = await getToken()
    const res = await fetch(`/api/staff?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? t.errorRemove)
    } else {
      setStaff(prev => prev.filter(s => s.id !== id))
    }
    setRemovingId(null)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{setupT.loginRequired}</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{setupT.accessDenied}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar
        left={
          <Link
            href="/dashboard/settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label={t.backToSettings}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
        center={
          <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
        }
        right={<div className="w-9" />}
      />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Add new staff member */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-500" />
            {t.addStaff}
          </h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t.passwordLabel}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {addError && <p className="text-xs text-red-500">{addError}</p>}
            <Button type="submit" disabled={adding}>
              {adding ? t.adding : t.addButton}
            </Button>
          </form>
        </div>

        {/* Staff list */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            {t.currentStaff}
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400">{messages.common.loading}</p>
          ) : loadError ? (
            <p className="text-sm text-red-500">{loadError}</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noStaff}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {staff.map(member => (
                <li
                  key={member.id}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        member.role === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role === 'admin' ? t.roleAdmin : t.roleStaff}
                    </span>
                    {member.role !== 'admin' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                        disabled={removingId === member.id}
                      >
                        <Trash2 className="h-3 w-3" />
                        {removingId === member.id ? t.removing : t.removeButton}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
