'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  ClipboardList,
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

interface Table {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

interface ReservationCreateModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  selectedTime?: string
  onSave: (reservation: Reservation) => void
  demoTables?: Table[]
  demoReservations?: Reservation[]
  onDemoSave?: (
    data: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>
  ) => Reservation
}

export default function ReservationCreateModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onSave,
  demoTables,
  demoReservations,
  onDemoSave,
}: ReservationCreateModalProps) {
  const { user, tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.reservationModal
  const common = messages.common
  const { prefs } = useDisplayPrefs()
  const { reservationLengthEnabled } = prefs
  const [loading, setLoading] = useState(false)
  const [tables, setTables] = useState<Table[]>([])
  const [availableTables, setAvailableTables] = useState<Table[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [showFloorPicker, setShowFloorPicker] = useState(false)
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    table_id: '',
    table_ids: [] as string[],
    table_identifiers: [] as string[],
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
      const reservedTableIds = demoReservations
        .filter(r => {
          if (r.date !== formData.date) return false

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
      setAvailableTables(tables.filter(t => !reservedTableIds.includes(t.id)))
      return
    }

    if (!supabase || !tenantId || !formData.date || !formData.time) return

    try {
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('table_id, table_ids, time, end_time')
        .eq('tenant_id', tenantId)
        .eq('date', formData.date)
        .not('table_id', 'is', null)

      if (error) throw error

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

      setAvailableTables(
        tables.filter(table => !reservedTableIds.includes(table.id))
      )
    } catch (err) {
      console.error('Error filtering available tables:', err)
      setAvailableTables(tables)
    }
  }, [
    tenantId,
    formData.date,
    formData.time,
    formData.end_time,
    reservationLengthEnabled,
    tables,
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
      setStep(0)
      const defaultDate = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
      const defaultTime = selectedTime || '18:00'
      setFormData({
        customer_name: '',
        customer_phone: '',
        table_id: '',
        table_ids: [],
        table_identifiers: [],
        date: defaultDate,
        time: defaultTime,
        end_time: '',
        party_size: '2',
        notes: '',
      })
    }
  }, [isOpen, selectedDate, selectedTime])

  // ── Wizard helpers ──────────────────────────────────────────────────────────
  const TOTAL_STEPS = reservationLengthEnabled ? 6 : 5

  const validateStep = (s: number): boolean => {
    if (reservationLengthEnabled) {
      switch (s) {
        case 0:
          return !!formData.date
        case 1:
          return !!formData.time
        case 2:
          return !!formData.end_time
        case 3:
          return !!formData.party_size
        case 4:
          return !!formData.customer_name.trim()
        case 5:
          return true
        default:
          return true
      }
    }
    switch (s) {
      case 0:
        return !!formData.date
      case 1:
        return !!formData.time
      case 2:
        return !!formData.party_size
      case 3:
        return !!formData.customer_name.trim()
      case 4:
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(step) && step < TOTAL_STEPS - 1) {
      setStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(prev => prev - 1)
    }
  }

  const submitReservation = async () => {
    setLoading(true)

    if (onDemoSave) {
      try {
        const demoData: Omit<Reservation, 'id' | 'created_at' | 'updated_at'> =
          {
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            table_id: formData.table_ids[0] ?? formData.table_id ?? null,
            table_ids: formData.table_ids,
            table_identifiers: formData.table_identifiers,
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
      const { data, error } = await supabase
        .from('reservations')
        .insert([
          {
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            table_id: formData.table_ids[0] ?? formData.table_id ?? null,
            table_ids: formData.table_ids,
            table_identifiers: formData.table_identifiers,
            date: formData.date,
            time: formData.time,
            end_time: formData.end_time || null,
            party_size: parseInt(formData.party_size),
            notes: formData.notes,
            tenant_id: tenantId,
            created_by: user.id,
          },
        ])
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  if (!isOpen) return null

  const stepTitles = reservationLengthEnabled
    ? [
        t.steps.date,
        t.steps.startTime,
        t.steps.endTime,
        t.steps.persons,
        t.steps.name,
        t.steps.additionalInfo,
      ]
    : [
        t.steps.date,
        t.steps.time,
        t.steps.persons,
        t.steps.name,
        t.steps.additionalInfo,
      ]
  const isLastStep = step === TOTAL_STEPS - 1
  const canProceed = validateStep(step)

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Content — centered in full page */}
        <div
          className="relative w-full max-w-lg p-6 sm:p-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Left arrow */}
          {step > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-8 sm:left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 bg-white rounded-full shadow-lg w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label={common.previous}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}

          {/* Right arrow / submit */}
          <button
            type="button"
            onClick={isLastStep ? submitReservation : handleNext}
            disabled={loading || !canProceed}
            className={`absolute right-8 sm:right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 rounded-full shadow-lg w-11 h-11 flex items-center justify-center transition-colors ${
              loading || !canProceed
                ? 'bg-white text-gray-300 shadow-sm cursor-not-allowed'
                : isLastStep
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-600'
            }`}
            aria-label={isLastStep ? t.createReservation : common.next}
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
            ) : isLastStep ? (
              <Check className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>

          {/* Content box */}
          <div className="bg-white rounded-xl shadow-2xl w-full overflow-y-auto transform transition-all">
            <div className="p-8">
              {/* Wizard slides */}
              {/* Wizard step — only the active step is rendered */}
              <div>
                {step === 0 && (
                  <StepDate
                    title={stepTitles[0]}
                    value={formData.date}
                    onChange={date => setFormData(fd => ({ ...fd, date }))}
                  />
                )}
                {step === 1 && (
                  <StepTime
                    title={stepTitles[1]}
                    value={formData.time}
                    onChange={time => setFormData(fd => ({ ...fd, time }))}
                    minuteStep={5}
                  />
                )}
                {reservationLengthEnabled && step === 2 && (
                  <StepTime
                    title={stepTitles[2]}
                    value={formData.end_time}
                    onChange={end_time =>
                      setFormData(fd => ({ ...fd, end_time }))
                    }
                    minuteStep={5}
                  />
                )}
                {step === (reservationLengthEnabled ? 3 : 2) && (
                  <StepPersons
                    title={stepTitles[reservationLengthEnabled ? 3 : 2]}
                    value={formData.party_size}
                    onChange={v =>
                      setFormData(fd => ({ ...fd, party_size: v }))
                    }
                  />
                )}
                {step === (reservationLengthEnabled ? 4 : 3) && (
                  <div className="space-y-1/2 px-1">
                    <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
                      <User className="h-5 w-5 text-blue-500" />
                      {stepTitles[reservationLengthEnabled ? 4 : 3]}
                    </p>
                    <input
                      type="text"
                      name="customer_name"
                      id="wiz_customer_name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder={t.customerNamePlaceholder}
                      value={formData.customer_name}
                      onChange={handleChange}
                    />
                  </div>
                )}
                {step === (reservationLengthEnabled ? 5 : 4) && (
                  <div className="space-y-6 px-1">
                    <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
                      <ClipboardList className="h-5 w-5 text-blue-500" />
                      {stepTitles[reservationLengthEnabled ? 5 : 4]}
                    </p>
                    <div>
                      <label
                        htmlFor="wiz_notes"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        {t.specialNotes}
                      </label>
                      <textarea
                        name="notes"
                        id="wiz_notes"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder={t.specialNotesPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t.table}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowFloorPicker(true)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                          formData.table_ids.length > 0
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-dashed border-gray-300 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50'
                        }`}
                      >
                        <UtensilsCrossed className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {formData.table_ids.length > 0
                            ? formData.table_identifiers.join(', ')
                            : t.selectTable}
                        </span>
                      </button>
                    </div>
                    <div>
                      <label
                        htmlFor="wiz_customer_phone"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        {t.phoneNumber}
                      </label>
                      <input
                        type="tel"
                        name="customer_phone"
                        id="wiz_customer_phone"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder={t.phonePlaceholder}
                        value={formData.customer_phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5 items-center justify-center mt-6">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === step
                        ? 'w-5 h-2 bg-blue-500'
                        : i < step
                          ? 'w-2 h-2 bg-blue-300'
                          : 'w-2 h-2 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloorPlanPickerModal
        isOpen={showFloorPicker}
        onClose={() => setShowFloorPicker(false)}
        tenantId={tenantId ?? ''}
        availableTableIds={new Set(availableTables.map(t => t.id))}
        allTables={tables}
        selectedIds={formData.table_ids}
        onConfirm={ids => {
          const identifiers = ids
            .map(id => tables.find(tb => tb.id === id)?.table_identifier)
            .filter(Boolean) as string[]
          setFormData(fd => ({
            ...fd,
            table_ids: ids,
            table_id: ids[0] ?? '',
            table_identifiers: identifiers,
          }))
        }}
      />
    </>
  )
}
