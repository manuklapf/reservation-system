'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Pencil,
  Settings,
  Globe,
  CalendarDays,
  LogOut,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import ReservationModal from '@/components/ReservationModal'
import { Reservation } from '@/types/reservation'
import { useI18n, Language } from '@/contexts/I18nContext'

// ── Inline range-picker ──────────────────────────────────────────────────────
function RangePicker({
  from,
  to,
  onChange,
  locale,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  locale: string
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [hovered, setHovered] = useState<string | null>(null)

  const toISO = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth, 1)
  // Monday-based offset
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(viewYear, viewMonth, i + 1)
    ),
  ]
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const handleClick = (iso: string) => {
    if (!from || (from && to)) {
      // start fresh
      onChange(iso, '')
    } else {
      // second click
      if (iso < from) onChange(iso, from)
      else onChange(from, iso)
    }
  }

  const inRange = (iso: string) => {
    const end = to || hovered || ''
    if (!from || !end) return false
    const lo = from < end ? from : end
    const hi = from < end ? end : from
    return iso > lo && iso < hi
  }

  const dayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, i + 1).toLocaleDateString(locale, { weekday: 'short' })
  )

  return (
    <div className="select-none">
      {/* header */}
      <div className="mb-2 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded p-1 hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {firstDay.toLocaleDateString(locale, {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <button onClick={nextMonth} className="rounded p-1 hover:bg-gray-100">
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      {/* day-of-week row */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {dayNames.map(d => (
          <div key={d} className="text-[10px] font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>
      {/* day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const iso = toISO(date)
          const isFrom = iso === from
          const isTo = iso === to
          const isEndpoint = isFrom || isTo
          const isIn = inRange(iso)
          return (
            <button
              key={iso}
              onClick={() => handleClick(iso)}
              onMouseEnter={() => setHovered(iso)}
              onMouseLeave={() => setHovered(null)}
              className={[
                'h-8 w-full text-xs transition-colors',
                isEndpoint
                  ? 'rounded-full bg-blue-600 font-semibold text-white'
                  : isIn
                    ? 'bg-blue-100 text-blue-800'
                    : 'rounded-full hover:bg-gray-100 text-gray-700',
              ].join(' ')}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading, signOut, tenantId } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterGuestName, setFilterGuestName] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const { language, setLanguage, messages } = useI18n()

  const t = messages.dashboard
  const common = messages.common

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && tenantId) {
      fetchReservations()
    }
  }, [user, tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReservations = async () => {
    if (!supabase) return

    try {
      setLoadingReservations(true)
      const { data, error } = await supabase
        .from('reservations')
        .select(
          `
          *,
          tables (
            table_identifier,
            capacity
          )
        `
        )
        .eq('tenant_id', tenantId)
        .order('date', { ascending: true })
        .order('time', { ascending: true })

      if (error) throw error
      setReservations(data || [])
    } catch (error) {
      console.error('Error fetching reservations:', error)
    } finally {
      setLoadingReservations(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleOpenEditModal = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedReservation(null)
  }

  const handleSaveReservation = async () => {
    await fetchReservations()
  }

  const handleDeleteReservation = async () => {
    await fetchReservations()
  }

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const activeFilterCount = [
    filterGuestName,
    filterDateFrom || filterDateTo,
  ].filter(Boolean).length

  const filteredReservations = reservations.filter(r => {
    if (
      filterGuestName &&
      !r.customer_name.toLowerCase().includes(filterGuestName.toLowerCase())
    )
      return false
    if (filterDateFrom && r.date < filterDateFrom) return false
    if (filterDateTo && r.date > filterDateTo) return false
    // Single-date click: no end date set, so treat as exact-day filter
    if (filterDateFrom && !filterDateTo && r.date > filterDateFrom) return false
    return true
  })

  // Group reservations by date, preserving sort order
  const groupedByDay = filteredReservations.reduce<
    Record<string, Reservation[]>
  >((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})
  const sortedDays = Object.keys(groupedByDay).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">{common.loading}</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
                className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={common.language}
                title={common.language}
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">
                  {language}
                </span>
              </button>
              <span className="text-sm text-gray-400">|</span>
              <Link
                href="/dashboard/settings"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={t.settings}
                title={t.settings}
              >
                <Settings className="h-5 w-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700"
                aria-label={t.signOut}
                title={t.signOut}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t.reservations}
            </h2>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/calendar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={t.calendarView}
                title={t.calendarView}
              >
                <CalendarDays className="h-5 w-5" />
              </Link>
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen(prev => !prev)}
                  className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    activeFilterCount > 0
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                  aria-label={t.filter}
                  title={t.filter}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-10 z-20 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          {t.filterGuestName}
                        </label>
                        <input
                          type="text"
                          value={filterGuestName}
                          onChange={e => setFilterGuestName(e.target.value)}
                          placeholder={t.filterGuestName}
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-gray-700">
                          {t.filterDate}
                          {(filterDateFrom || filterDateTo) && (
                            <span className="ml-2 font-normal text-blue-600">
                              {filterDateFrom.split('-').reverse().join('.')}
                              {filterDateTo && filterDateTo !== filterDateFrom
                                ? ` – ${filterDateTo.split('-').reverse().join('.')}`
                                : ''}
                            </span>
                          )}
                        </label>
                        <RangePicker
                          from={filterDateFrom}
                          to={filterDateTo}
                          onChange={(f, t2) => {
                            setFilterDateFrom(f)
                            setFilterDateTo(t2)
                          }}
                          locale={language === 'de' ? 'de-DE' : 'en-US'}
                        />
                      </div>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => {
                            setFilterGuestName('')
                            setFilterDateFrom('')
                            setFilterDateTo('')
                          }}
                          className="w-full text-center text-sm text-gray-500 underline hover:text-gray-800"
                        >
                          {t.clearFilters}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loadingReservations ? (
            <div className="text-center py-8">
              <div className="text-lg">{t.loadingReservations}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReservations.length === 0 ? (
                <div className="bg-white shadow sm:rounded-md text-center py-8">
                  <p className="text-gray-500">{t.noReservations}</p>
                  <Link
                    href="/dashboard/reservations/new"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                  >
                    {t.createFirstReservation}
                  </Link>
                </div>
              ) : (
                sortedDays.map(day => (
                  <div key={day}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                      {new Date(day + 'T00:00:00').toLocaleDateString(
                        language === 'de' ? 'de-DE' : 'en-US',
                        {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </h3>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {groupedByDay[day].map(reservation => (
                          <li key={reservation.id}>
                            <div className="px-4 py-4 sm:px-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {reservation.customer_name}
                                    </p>
                                  </div>
                                  <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                      <p className="flex items-center text-sm text-gray-500">
                                        {t.table}{' '}
                                        {reservation.tables?.table_identifier ||
                                          reservation.table_number ||
                                          common.notAvailable}{' '}
                                        • {reservation.party_size} {t.guests}
                                      </p>
                                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                        {t.at} {reservation.time}
                                      </p>
                                    </div>
                                  </div>
                                  {reservation.notes && (
                                    <p className="mt-2 text-sm text-gray-600">
                                      {t.notes}: {reservation.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditModal(reservation)
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                                    aria-label={t.editReservation}
                                    title={t.editReservation}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reservation={selectedReservation}
        onSave={handleSaveReservation}
        onDelete={handleDeleteReservation}
      />
    </div>
  )
}
