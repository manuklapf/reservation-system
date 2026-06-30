'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Trash2,
  Check,
  ChevronDown,
  CalendarDays,
  Clock,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { Reservation } from '@/types/reservation'
import { useI18n } from '@/contexts/I18nContext'
import { useDisplayPrefs } from '@/contexts/DisplayPrefsContext'
import { timesOverlap, withinOneHour } from '@/utils/reservationConflictChecker'
import StepDate from './StepDate'
import StepTime from './StepTime'
import StepPersons from './StepPersons'
import FloorPlanPickerModal from './FloorPlanPickerModal'
import ConfirmDialog from './ConfirmDialog'
import ReservationChip from './ReservationChip'

interface Table {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

interface ReservationEditModalProps {
  isOpen: boolean
  onClose: () => void
  reservation: Reservation
  onSave: (reservation: Reservation) => void
  onDelete?: (reservationId: string) => void
  demoTables?: Table[]
  demoReservations?: Reservation[]
  onDemoSave?: (
    data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
  ) => Reservation
  onDemoDelete?: (id: string) => void
}

export default function ReservationEditModal({
  isOpen,
  onClose,
  reservation,
  onSave,
  onDelete,
  demoTables,
  demoReservations,
  onDemoSave,
  onDemoDelete,
}: ReservationEditModalProps) {
  const { user, tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.reservationModal
  const common = messages.common
  const { prefs } = useDisplayPrefs()
  const { reservationLengthEnabled } = prefs
  const [loading, setLoading] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [availableTables, setAvailableTables] = useState<Table[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [showAdditional, setShowAdditional] = useState(false)
  const [showFloorPicker, setShowFloorPicker] = useState(false)
  const [activeStep, setActiveStep] = useState<
    'date' | 'time' | 'end_time' | 'persons' | null
  >(null)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    table_ids: [] as string[],
    date: '',
    time: '',
    end_time: '',
    party_size: '',
    notes: '',
  })

  const fetchTables = React.useCallback(async () => {
    if (!supabase || !tenantId) return
    try {
      setLoadingTables(true)
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('table_identifier')
      if (error) throw error
      setTables(data || [])
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoadingTables(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (isOpen && demoTables) {
      setTables(demoTables.filter(t => t.is_active))
      setLoadingTables(false)
    }
  }, [isOpen, demoTables])

  useEffect(() => {
    if (isOpen && tenantId && supabase && !demoTables) {
      fetchTables()
    }
  }, [isOpen, tenantId, fetchTables, demoTables])

  const filterAvailableTables = React.useCallback(async () => {
    if (demoReservations) {
      const currentIds = new Set(
        reservation.table_ids?.length
          ? reservation.table_ids
          : reservation.table_id
            ? [reservation.table_id]
            : []
      )

      const reservedTableIds = demoReservations
        .filter(r => {
          if (r.date !== formData.date || r.id === reservation.id) return false

          if (reservationLengthEnabled) {
            // Check if time ranges overlap
            return timesOverlap(
              formData.time,
              formData.end_time || undefined,
              r.time,
              r.end_time
            )
          } else {
            // Check if within ±1 hour
            return withinOneHour(formData.time, r.time)
          }
        })
        .flatMap(r =>
          r.table_ids?.length ? r.table_ids : r.table_id ? [r.table_id] : []
        )
        .filter((id: string) => !currentIds.has(id))

      setAvailableTables(tables.filter(t => !reservedTableIds.includes(t.id)))
      return
    }

    if (!supabase || !tenantId || !formData.date || !formData.time) return

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('table_id, table_ids, time, end_time')
      .eq('tenant_id', tenantId)
      .eq('date', formData.date)
      .neq('id', reservation.id)

    if (error) {
      console.error('Error filtering available tables:', error.message)
      setAvailableTables(tables)
      return
    }

    const currentIds = new Set(
      reservation.table_ids?.length
        ? reservation.table_ids
        : reservation.table_id
          ? [reservation.table_id]
          : []
    )

    const reservedTableIds = (reservations || [])
      .filter(r => {
        if (reservationLengthEnabled) {
          // Check if time ranges overlap
          return timesOverlap(
            formData.time,
            formData.end_time || undefined,
            r.time,
            r.end_time
          )
        } else {
          // Check if within ±1 hour
          return withinOneHour(formData.time, r.time)
        }
      })
      .flatMap(r =>
        r.table_ids?.length ? r.table_ids : r.table_id ? [r.table_id] : []
      )
      .filter((id: string) => !currentIds.has(id))

    setAvailableTables(
      tables.filter(table => !reservedTableIds.includes(table.id))
    )
  }, [
    tenantId,
    formData.date,
    formData.time,
    formData.end_time,
    reservationLengthEnabled,
    tables,
    reservation,
    demoReservations,
  ])

  useEffect(() => {
    if (isOpen && tables.length > 0 && formData.date && formData.time) {
      filterAvailableTables()
    }
  }, [
    isOpen,
    tables,
    formData.date,
    formData.time,
    formData.end_time,
    reservationLengthEnabled,
    filterAvailableTables,
  ])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone,
        table_ids: reservation.table_ids?.length
          ? reservation.table_ids
          : reservation.table_id
            ? [reservation.table_id]
            : [],
        date: reservation.date,
        time: reservation.time,
        end_time: reservation.end_time ?? '',
        party_size: reservation.party_size.toString(),
        notes: reservation.notes || '',
      })
      setShowAdditional(!!(reservation.notes || reservation.customer_phone))
    }
  }, [isOpen, reservation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.table_ids.length) {
      alert(t.errors.selectTable)
      return
    }

    setLoading(true)

    if (onDemoSave) {
      try {
        const demoData: Omit<Reservation, 'id' | 'created_at' | 'updated_at'> =
          {
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            table_id: formData.table_ids[0] ?? null,
            table_ids: formData.table_ids,
            table_identifiers: formData.table_ids
              .map(id => tables.find(tb => tb.id === id)?.table_identifier)
              .filter(Boolean) as string[],
            table_number: null,
            date: formData.date,
            time: formData.time,
            end_time: formData.end_time || null,
            party_size: parseInt(formData.party_size),
            notes: formData.notes,
            tenant_id: 'demo-tenant',
            created_by: 'demo',
          }
        const saved = onDemoSave(demoData)
        onSave(saved)
        onClose()
      } finally {
        setLoading(false)
      }
      return
    }

    if (!user) {
      setLoading(false)
      alert(t.errors.notAuthenticated)
      return
    }
    if (!tenantId) {
      setLoading(false)
      alert(t.errors.noTenant)
      return
    }
    if (!supabase) {
      setLoading(false)
      alert(t.errors.noDbConnection)
      return
    }

    try {
      const reservationData = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        table_id: formData.table_ids[0] ?? null,
        table_ids: formData.table_ids,
        table_identifiers: formData.table_ids
          .map(id => tables.find(tb => tb.id === id)?.table_identifier)
          .filter(Boolean),
        date: formData.date,
        time: formData.time,
        end_time: formData.end_time || null,
        party_size: parseInt(formData.party_size),
        notes: formData.notes,
        tenant_id: tenantId,
        created_by: user.id,
      }

      const { data, error } = await supabase
        .from('reservations')
        .update(reservationData)
        .eq('id', reservation.id)
        .select()
        .single()

      if (error) throw error
      onSave(data)
      onClose()
    } catch (error: any) {
      console.error('Error saving reservation:', error)
      let errorMessage = t.errors.saveFailed
      if (error?.message) errorMessage += ': ' + error.message
      if (error?.hint)
        errorMessage += `\n\n${t.errors.hintPrefix}: ` + error.hint
      if (
        error?.message?.includes('column "table_id" of relation "reservations"')
      )
        errorMessage = t.errors.dbSetupRequired
      if (
        error?.message?.includes('null value in column "table_number"') ||
        (error?.message?.includes('table_number') &&
          error?.message?.includes('not-null'))
      )
        errorMessage = t.errors.dbMigrationRequired
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setPendingConfirm({
      title: t.confirmDeleteTitle,
      message: t.confirmDelete,
      onConfirm: async () => {
        setLoading(true)
        if (onDemoDelete) {
          onDemoDelete(reservation.id)
          onDelete?.(reservation.id)
          setLoading(false)
          onClose()
          return
        }
        if (!supabase) {
          setLoading(false)
          return
        }
        try {
          const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('id', reservation.id)
          if (error) throw error
          onDelete?.(reservation.id)
          onClose()
        } catch (error) {
          console.error('Error deleting reservation:', error)
          alert(t.errors.deleteFailed)
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <ConfirmDialog
        isOpen={!!pendingConfirm}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={messages.common.delete}
        danger
        onConfirm={() => {
          pendingConfirm?.onConfirm()
          setPendingConfirm(null)
        }}
        onCancel={() => setPendingConfirm(null)}
      />
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg"
          onClick={e => e.stopPropagation()}
        >
          {/* Delete button — left side */}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="absolute left-0.5 sm:left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 bg-white rounded-full shadow-lg w-11 h-11 flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={t.deleteReservation}
              title={t.deleteReservation}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}

          {/* Submit button — right side */}
          <button
            form="edit-reservation-form"
            type="submit"
            disabled={loading}
            className="absolute right-0.5 sm:right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg w-11 h-11 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={t.updateReservation}
            title={t.updateReservation}
          >
            {loading ? (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <Check className="h-5 w-5" />
            )}
          </button>

          <div className="bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="p-8">
              <form
                id="edit-reservation-form"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* Customer name */}
                <div>
                  <label
                    htmlFor="customer_name"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    {t.customerName}
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    id="customer_name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder={t.customerNamePlaceholder}
                    value={formData.customer_name}
                    onChange={handleChange}
                  />
                </div>

                {/* Chip grid */}
                {(() => {
                  const selectedTables = formData.table_ids
                    .map(id => tables.find(tb => tb.id === id))
                    .filter(Boolean)
                  const hasTableSelection = selectedTables.length > 0
                  const tableLabel = hasTableSelection
                    ? selectedTables.map(tb => tb!.table_identifier).join(', ')
                    : t.selectTable
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <ReservationChip
                        icon={<CalendarDays className="h-3.5 w-3.5" />}
                        label={t.date}
                        value={formData.date.split('-').reverse().join('.')}
                        active={activeStep === 'date'}
                        activeClass="bg-blue-500 text-white"
                        inactiveClass="bg-blue-100 text-blue-700 hover:bg-blue-200"
                        onClick={() =>
                          setActiveStep(prev =>
                            prev === 'date' ? null : 'date'
                          )
                        }
                      />
                      <ReservationChip
                        icon={<Clock className="h-3.5 w-3.5" />}
                        label={
                          reservationLengthEnabled ? t.steps.startTime : t.time
                        }
                        value={formData.time?.slice(0, 5)}
                        active={activeStep === 'time'}
                        activeClass="bg-violet-500 text-white"
                        inactiveClass="bg-violet-100 text-violet-700 hover:bg-violet-200"
                        onClick={() =>
                          setActiveStep(prev =>
                            prev === 'time' ? null : 'time'
                          )
                        }
                      />
                      {reservationLengthEnabled && (
                        <ReservationChip
                          icon={<Clock className="h-3.5 w-3.5" />}
                          label={t.steps.endTime}
                          value={formData.end_time?.slice(0, 5) || '—'}
                          active={activeStep === 'end_time'}
                          activeClass="bg-violet-500 text-white"
                          inactiveClass={
                            formData.end_time
                              ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }
                          onClick={() =>
                            setActiveStep(prev =>
                              prev === 'end_time' ? null : 'end_time'
                            )
                          }
                        />
                      )}
                      <ReservationChip
                        icon={<Users className="h-3.5 w-3.5" />}
                        label={t.partySize}
                        value={`${formData.party_size} ${
                          parseInt(formData.party_size) === 1
                            ? t.person
                            : t.people
                        }`}
                        active={activeStep === 'persons'}
                        activeClass="bg-red-500 text-white"
                        inactiveClass="bg-red-50 text-red-600 hover:bg-red-100"
                        onClick={() =>
                          setActiveStep(prev =>
                            prev === 'persons' ? null : 'persons'
                          )
                        }
                      />
                      <ReservationChip
                        icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
                        label={t.table}
                        value={tableLabel}
                        active={showFloorPicker}
                        activeClass="bg-emerald-500 text-white"
                        inactiveClass={
                          hasTableSelection
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }
                        onClick={() => {
                          setActiveStep(null)
                          setShowFloorPicker(true)
                        }}
                      />
                    </div>
                  )
                })()}

                {/* Inline step panels */}
                {activeStep === 'date' && (
                  <div className="rounded-xl !bg-blue-100 p-4">
                    <StepDate
                      title={t.date}
                      value={formData.date}
                      transparentBackground
                      onChange={date => setFormData(fd => ({ ...fd, date }))}
                    />
                  </div>
                )}
                {activeStep === 'time' && (
                  <div className="rounded-xl bg-violet-100 p-4">
                    <StepTime
                      title={
                        reservationLengthEnabled ? t.steps.startTime : t.time
                      }
                      value={formData.time}
                      transparentBackground
                      onChange={time => setFormData(fd => ({ ...fd, time }))}
                      minuteStep={5}
                    />
                  </div>
                )}
                {activeStep === 'end_time' && (
                  <div className="rounded-xl bg-violet-100 p-4">
                    <StepTime
                      title={t.steps.endTime}
                      value={formData.end_time || formData.time}
                      transparentBackground
                      onChange={end_time =>
                        setFormData(fd => ({ ...fd, end_time }))
                      }
                      minuteStep={5}
                    />
                  </div>
                )}
                {activeStep === 'persons' && (
                  <div className="rounded-xl !bg-red-50 p-4">
                    <StepPersons
                      title={t.partySize}
                      value={formData.party_size}
                      transparentBackground
                      onChange={v =>
                        setFormData(fd => ({ ...fd, party_size: v }))
                      }
                    />
                  </div>
                )}

                {/* Notes + Additional info accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdditional(prev => !prev)}
                    className="flex w-full items-center justify-between py-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
                  >
                    <span>{t.additionalInfo}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        showAdditional ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showAdditional && (
                    <div className="mt-3 space-y-4">
                      <div>
                        <label
                          htmlFor="notes"
                          className="block text-sm font-semibold text-gray-700 mb-2"
                        >
                          {t.specialNotes}
                        </label>
                        <textarea
                          name="notes"
                          id="notes"
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                          value={formData.notes}
                          onChange={handleChange}
                          placeholder={t.specialNotesPlaceholder}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="customer_phone"
                          className="block text-sm font-semibold text-gray-700 mb-2"
                        >
                          {t.phoneNumber}
                        </label>
                        <input
                          type="tel"
                          name="customer_phone"
                          id="customer_phone"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder={t.phonePlaceholder}
                          value={formData.customer_phone}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Floor plan table picker */}
      <FloorPlanPickerModal
        isOpen={showFloorPicker}
        onClose={() => setShowFloorPicker(false)}
        tenantId={tenantId ?? ''}
        availableTableIds={new Set(availableTables.map(t => t.id))}
        allTables={tables}
        selectedIds={formData.table_ids}
        onConfirm={ids => setFormData(fd => ({ ...fd, table_ids: ids }))}
      />
    </>
  )
}
