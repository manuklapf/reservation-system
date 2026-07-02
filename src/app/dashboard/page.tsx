'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Settings,
  CalendarDays,
  List,
  SlidersHorizontal,
  Plus,
  LayoutDashboard,
  Bell,
} from '@/components/icons'
import CalendarKitCalendar from '@/components/CalendarKitCalendar'
import ReservationModal from '@/components/ReservationModal'
import ReservationRow from '@/components/ReservationRow'
import RangePicker from '@/components/RangePicker'
import DayPlanModal from '@/components/DayPlanModal'
import MailboxPanel from '@/components/MailboxPanel'
import { Reservation } from '@/types/reservation'
import { useI18n, Language } from '@/contexts/I18nContext'

function CapacityRing({ used, total }: { used: number; total: number }) {
  const r = 10
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(used / total, 1) : 0
  const offset = circ * (1 - pct)
  const color =
    total === 0
      ? '#d1d5db'
      : pct >= 1
        ? '#ef4444'
        : pct >= 0.8
          ? '#f59e0b'
          : '#22c55e'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="4"
      />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 12 12)"
      />
    </svg>
  )
}

export default function DashboardPage() {
  const { user, loading, tenantId, isPlatformAdmin } = useAuth()
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
  const [dayPlanDate, setDayPlanDate] = useState<string | null>(null)
  const [totalCapacity, setTotalCapacity] = useState<number | null>(null)
  const [tooltipDay, setTooltipDay] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarKey, setCalendarKey] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const [mailboxOpen, setMailboxOpen] = useState(false)
  const [tenantName, setTenantName] = useState('')
  const filterRef = useRef<HTMLDivElement>(null)
  const { language, messages } = useI18n()

  const t = messages.dashboard
  const common = messages.common

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    } else if (!loading && user && isPlatformAdmin) {
      router.push('/admin')
    }
  }, [user, loading, isPlatformAdmin, router])

  useEffect(() => {
    if (user && tenantId) {
      fetchReservations()
    }
  }, [user, tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tenantId || !supabase) return
    supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => {
        if (data?.name) setTenantName(data.name)
      })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId || !supabase) return
    supabase
      .from('floor_plans')
      .select('layout')
      .eq('tenant_id', tenantId)
      .then(async ({ data: fpData }) => {
        if (!fpData?.length) return
        const placedIds = new Set<string>()
        for (const fp of fpData) {
          const layout = (fp.layout as Array<{ id: string }> | null) ?? []
          for (const t of layout) {
            if (t.id) placedIds.add(t.id)
          }
        }
        if (!placedIds.size) return
        const { data: tableData } = await supabase!
          .from('tables')
          .select('capacity')
          .in('id', Array.from(placedIds))
          .eq('is_active', true)
        if (tableData) {
          setTotalCapacity(tableData.reduce((s, t) => s + (t.capacity ?? 0), 0))
        }
      })
  }, [tenantId])

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

  const handleOpenEditModal = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsModalOpen(true)
  }

  const handleOpenNewModal = () => {
    setSelectedReservation(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedReservation(null)
    setSelectedSlot(null)
  }

  const handleSaveReservation = async () => {
    await fetchReservations()
    setCalendarKey(prev => prev + 1)
  }

  const handleDeleteReservation = async () => {
    await fetchReservations()
    setCalendarKey(prev => prev + 1)
  }

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedReservation(null)
    setSelectedSlot(slotInfo)
    setIsModalOpen(true)
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

  useEffect(() => {
    if (!tooltipDay) return
    let handler: (() => void) | null = null
    const id = setTimeout(() => {
      handler = () => setTooltipDay(null)
      document.addEventListener('click', handler)
    }, 0)
    return () => {
      clearTimeout(id)
      if (handler) document.removeEventListener('click', handler)
    }
  }, [tooltipDay])

  const activeFilterCount = [
    filterGuestName,
    filterDateFrom || filterDateTo,
  ].filter(Boolean).length

  // Pending guest requests shown only in mailbox; approved ones appear in main list
  const pendingRequests = reservations.filter(
    r => r.is_requested && !r.approved_by
  )

  const filteredReservations = reservations.filter(r => {
    // Exclude unapproved guest requests from main list
    if (r.is_requested && !r.approved_by) return false
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

  const todayISO = new Date().toISOString().split('T')[0]
  const dateFilterActive = !!(filterDateFrom || filterDateTo)

  // Group reservations by date, preserving sort order
  const groupedByDay = filteredReservations.reduce<
    Record<string, Reservation[]>
  >((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})
  const allDays = Object.keys(groupedByDay).sort()
  const visibleDays = dateFilterActive
    ? allDays
    : allDays.filter(d => d >= todayISO)

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
      <nav
        className="bg-white shadow-sm border-b sticky top-0 m-1"
        style={{ zIndex: 50 }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setMailboxOpen(true)}
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={t.mailbox}
                title={t.mailbox}
              >
                <Bell className="h-5 w-5" />
                {pendingRequests.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
                  </span>
                )}
              </button>
              <Link
                href="/dashboard/settings"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={t.settings}
                title={t.settings}
              >
                <Settings className="h-5 w-5" />
              </Link>
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
              <button
                onClick={() => setShowCalendar(prev => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={showCalendar ? t.reservations : t.calendarView}
                title={showCalendar ? t.reservations : t.calendarView}
              >
                {showCalendar ? (
                  <List className="h-5 w-5" />
                ) : (
                  <CalendarDays className="h-5 w-5" />
                )}
              </button>
              {!showCalendar && (
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
              )}
            </div>
          </div>

          {showCalendar ? (
            <div className="rounded-lg">
              <CalendarKitCalendar
                refreshKey={calendarKey}
                onSelectEvent={handleOpenEditModal}
                onSelectSlot={handleSelectSlot}
              />
            </div>
          ) : loadingReservations ? (
            <div className="text-center py-8">
              <div className="text-lg">{t.loadingReservations}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReservations.length === 0 ? (
                <div className="bg-white shadow sm:rounded-md text-center py-8">
                  <p className="text-gray-500">{t.noReservations}</p>
                </div>
              ) : (
                visibleDays.map(day => {
                  const usedCapacity = groupedByDay[day].reduce(
                    (s, r) => s + r.party_size,
                    0
                  )
                  return (
                    <div key={day}>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
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
                          <div
                            className="relative inline-flex items-center cursor-pointer"
                            onPointerEnter={e => {
                              if (e.pointerType === 'mouse') setTooltipDay(day)
                            }}
                            onPointerLeave={e => {
                              if (e.pointerType === 'mouse') setTooltipDay(null)
                            }}
                            onClick={e => {
                              e.stopPropagation()
                              setTooltipDay(prev => (prev === day ? null : day))
                            }}
                          >
                            <CapacityRing
                              used={usedCapacity}
                              total={totalCapacity ?? 0}
                            />
                            {tooltipDay === day && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 bg-gray-800 text-white text-xs font-semibold rounded-md whitespace-nowrap z-20 pointer-events-none shadow">
                                {usedCapacity} / {totalCapacity ?? '?'}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setDayPlanDate(day)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                          title="Edit day plan"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                          {groupedByDay[day].map(reservation => (
                            <ReservationRow
                              key={reservation.id}
                              reservation={reservation}
                              onEdit={handleOpenEditModal}
                            />
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </main>

      {!showCalendar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={handleOpenNewModal}
            className="inline-flex whitespace-nowrap items-center gap-2 px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            {t.newReservation}
          </button>
        </div>
      )}

      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reservation={selectedReservation}
        selectedDate={selectedSlot?.start}
        selectedTime={
          selectedSlot?.start
            ? `${selectedSlot.start.getHours().toString().padStart(2, '0')}:${selectedSlot.start.getMinutes().toString().padStart(2, '0')}`
            : undefined
        }
        onSave={handleSaveReservation}
        onDelete={handleDeleteReservation}
      />

      {dayPlanDate && (
        <DayPlanModal
          isOpen={!!dayPlanDate}
          onClose={() => setDayPlanDate(null)}
          date={dayPlanDate}
          reservations={groupedByDay[dayPlanDate] ?? []}
          tenantId={tenantId ?? ''}
          onSave={fetchReservations}
        />
      )}

      <MailboxPanel
        isOpen={mailboxOpen}
        onClose={() => setMailboxOpen(false)}
        requests={pendingRequests}
        onRefresh={fetchReservations}
        tenantName={tenantName}
      />
    </div>
  )
}
