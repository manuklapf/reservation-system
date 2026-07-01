'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  ClipboardList,
  CalendarCheck,
} from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import StepDate from './StepDate'
import StepTime from './StepTime'
import StepPersons from './StepPersons'

interface ReservationRequestFormProps {
  tenantId: string
  tenantName: string
}

const TOTAL_STEPS = 5

export default function ReservationRequestForm({
  tenantId,
  tenantName,
}: ReservationRequestFormProps) {
  const { messages } = useI18n()
  const t = messages.reservationRequest

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [formData, setFormData] = useState({
    date: defaultDate,
    time: '18:00',
    party_size: '2',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
  })

  const validateStep = (s: number): boolean => {
    switch (s) {
      case 0:
        return !!formData.date
      case 1:
        return !!formData.time
      case 2:
        return !!formData.party_size
      case 3:
        return (
          !!formData.customer_name.trim() && !!formData.customer_email.trim()
        )
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
    if (step > 0) setStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!supabase) {
      setError('Service unavailable. Please try again later.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: insertError } = await supabase
        .from('reservations')
        .insert([
          {
            customer_name: formData.customer_name,
            customer_email: formData.customer_email || null,
            customer_phone: formData.customer_phone || '',
            table_id: null,
            table_ids: [],
            table_identifiers: [],
            table_number: null,
            date: formData.date,
            time: formData.time,
            end_time: null,
            party_size: parseInt(formData.party_size),
            notes: formData.notes || null,
            tenant_id: tenantId,
            created_by: null,
            is_requested: true,
            approved_by: null,
          },
        ])

      if (insertError) throw insertError
      setSubmitted(true)
    } catch (err: any) {
      console.error('Error submitting request:', err)
      setError(err?.message ?? 'Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setError(null)
    setStep(0)
    setFormData({
      date: defaultDate,
      time: '18:00',
      party_size: '2',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      notes: '',
    })
  }

  const stepTitles = [
    t.steps.date,
    t.steps.time,
    t.steps.persons,
    t.steps.name,
    t.steps.additionalInfo,
  ]

  const isLastStep = step === TOTAL_STEPS - 1
  const canProceed = validateStep(step)

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CalendarCheck className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t.successTitle}
        </h2>
        <p className="text-gray-500 max-w-sm mb-8">{t.successMessage}</p>
        <button
          onClick={handleReset}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-colors"
        >
          {t.newRequest}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6 px-4">
        <h1 className="text-2xl font-bold text-gray-900">{tenantName}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      <div className="relative p-6 sm:p-4">
        {/* Left arrow */}
        {step > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-8 sm:left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 bg-white rounded-full shadow-lg w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label={messages.common.previous}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}

        {/* Right arrow / submit */}
        <button
          type="button"
          onClick={isLastStep ? handleSubmit : handleNext}
          disabled={loading || !canProceed}
          className={`absolute right-8 sm:right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 rounded-full shadow-lg w-11 h-11 flex items-center justify-center transition-colors ${
            loading || !canProceed
              ? 'bg-white text-gray-300 shadow-sm cursor-not-allowed'
              : isLastStep
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-600'
          }`}
          aria-label={isLastStep ? t.submit : messages.common.next}
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

        {/* Content card */}
        <div className="bg-white rounded-xl shadow-2xl w-full overflow-y-auto transform transition-all">
          <div className="p-8">
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
                minuteStep={15}
              />
            )}
            {step === 2 && (
              <StepPersons
                title={stepTitles[2]}
                value={formData.party_size}
                onChange={v => setFormData(fd => ({ ...fd, party_size: v }))}
              />
            )}
            {step === 3 && (
              <div className="space-y-4 px-1">
                <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
                  <User className="h-5 w-5 text-blue-500" />
                  {stepTitles[3]}
                </p>
                <input
                  type="text"
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder={t.customerNamePlaceholder}
                  value={formData.customer_name}
                  onChange={e =>
                    setFormData(fd => ({
                      ...fd,
                      customer_name: e.target.value,
                    }))
                  }
                />
                <input
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder={t.emailPlaceholder}
                  value={formData.customer_email}
                  onChange={e =>
                    setFormData(fd => ({
                      ...fd,
                      customer_email: e.target.value,
                    }))
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleNext()
                  }}
                />
              </div>
            )}
            {step === 4 && (
              <div className="space-y-5 px-1">
                <p className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-3">
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                  {stepTitles[4]}
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.phoneNumber}
                  </label>
                  <input
                    type="tel"
                    autoFocus
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder={t.phonePlaceholder}
                    value={formData.customer_phone}
                    onChange={e =>
                      setFormData(fd => ({
                        ...fd,
                        customer_phone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.specialNotes}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder={t.specialNotesPlaceholder}
                    value={formData.notes}
                    onChange={e =>
                      setFormData(fd => ({ ...fd, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
            )}

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
  )
}
