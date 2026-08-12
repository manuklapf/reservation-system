'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { Reservation } from '@/types/reservation'
import { X, Check, Mail } from '@/components/icons'

interface MailboxPanelProps {
  isOpen: boolean
  onClose: () => void
  requests: Reservation[]
  onRefresh: () => void
}

export default function MailboxPanel({
  isOpen,
  onClose,
  requests,
  onRefresh,
}: MailboxPanelProps) {
  const { user, tenantId, staffName } = useAuth()
  const { messages, language } = useI18n()
  const t = messages.mailbox
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

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

  const sendEmailNotification = async (
    type: 'approved' | 'denied',
    reservation: Reservation
  ) => {
    if (!reservation.customer_email || !supabase) return
    try {
      // The server reads the guest's address and the message details from the
      // database itself; it only needs to know which reservation and who is
      // asking, so the endpoint can't be turned into an open mail relay.
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return

      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, reservationId: reservation.id }),
      })
    } catch (err) {
      console.error('Failed to send email notification:', err)
    }
  }

  const handleApprove = async (reservation: Reservation) => {
    if (!supabase || !user) return
    const approverName = staffName ?? user.email ?? 'Staff'
    const { error } = await supabase
      .from('reservations')
      .update({ approved_by: approverName })
      .eq('id', reservation.id)
    if (!error) {
      await sendEmailNotification('approved', reservation)
      onRefresh()
    }
  }

  const handleDecline = async (reservation: Reservation) => {
    if (!supabase) return
    // Send email before deleting so we still have the address
    await sendEmailNotification('denied', reservation)
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservation.id)
    if (!error) onRefresh()
  }

  const formatDate = (date: string) =>
    new Date(date + 'T00:00:00').toLocaleDateString(
      language === 'de' ? 'de-DE' : 'en-US',
      { weekday: 'short', month: 'short', day: 'numeric' }
    )

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white border-2 border-black z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-danger" />
            <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
            {requests.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">
                {requests.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-accent hover:text-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
              <Mail className="h-12 w-12 text-gray-200 mb-4" />
              <p className="text-gray-400 text-sm">{t.empty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {requests.map(r => (
                <li key={r.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {r.customer_name}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(r)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success/35 text-success-ink hover:bg-success-hover hover:text-success-fg transition-colors"
                        title={t.approve}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDecline(r)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-danger-soft text-danger-ink hover:bg-danger-hover hover:text-danger-fg transition-colors"
                        title={t.decline}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold ring-2 ring-black text-accent-ink">
                      {formatDate(r.date)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-semibold ring-2 ring-black text-info-ink">
                      {r.time.slice(0, 5)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold ring-2 ring-black text-accent-ink">
                      {r.party_size} {t.guests}
                    </span>
                    {r.customer_email && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold ring-2 ring-black text-gray-600">
                        {r.customer_email}
                      </span>
                    )}
                    {r.customer_phone && (
                      <span className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold ring-2 ring-black text-warning-ink">
                        {r.customer_phone}
                      </span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="mt-1.5 text-xs text-gray-500 truncate italic">
                      {r.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
