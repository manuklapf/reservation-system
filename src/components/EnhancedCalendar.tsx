'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Calendar, Views, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Setup the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

// Sample data for testing
const sampleReservations: Reservation[] = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_phone: '123-456-7890',
    table_number: 5,
    date: '2025-10-15',
    time: '18:00',
    party_size: 4,
    status: 'confirmed',
    notes: 'Anniversary dinner',
    created_at: '2025-10-14T10:00:00Z',
    updated_at: '2025-10-14T10:00:00Z',
    tenant_id: 'sample-tenant',
    created_by: 'staff-1'
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    customer_phone: '987-654-3210',
    table_number: 3,
    date: '2025-10-16',
    time: '19:30',
    party_size: 2,
    status: 'pending',
    notes: null,
    created_at: '2025-10-14T11:00:00Z',
    updated_at: '2025-10-14T11:00:00Z',
    tenant_id: 'sample-tenant',
    created_by: 'staff-1'
  }
]

interface Reservation {
  id: string
  customer_name: string
  customer_phone: string
  table_number: number
  date: string
  time: string
  party_size: number
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  tenant_id: string
  created_by: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Reservation
}

interface EnhancedCalendarProps {
  onSelectEvent?: (reservation: Reservation) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  selectedDate?: Date
}

export default function EnhancedCalendar({ 
  onSelectEvent, 
  onSelectSlot, 
  selectedDate = new Date() 
}: EnhancedCalendarProps) {
  const { user, tenantId } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(selectedDate)

  // Fetch reservations from Supabase
  const fetchReservations = useCallback(async () => {
    setLoading(true)
    
    // Try to fetch real data first, fall back to sample data
    if (supabase && tenantId) {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('date', { ascending: true })
          .order('time', { ascending: true })

        if (error) throw error
        setReservations(data || [])
        setLoading(false)
        return
      } catch (error) {
        console.error('Error fetching reservations:', error)
        // Fall through to sample data
      }
    }
    
    // Use sample data when Supabase is not available or on error
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500))
      setReservations(sampleReservations)
    } catch (error) {
      console.error('Error loading reservations:', error)
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  // Custom toolbar component
  const CustomToolbar = useCallback((toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV')
    }

    const goToNext = () => {
      toolbar.onNavigate('NEXT')
    }

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY')
    }

    const label = () => {
      const date = toolbar.date
      return (
        <span className="text-lg font-semibold text-gray-900">
          {localizer.format(date, 'MMMM yyyy', 'en-US')}
        </span>
      )
    }

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToBack}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
          >
            ←
          </button>
          <button
            onClick={goToCurrent}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
          >
            →
          </button>
          {label()}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setView(Views.MONTH)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              view === Views.MONTH
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView(Views.WEEK)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              view === Views.WEEK
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView(Views.DAY)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              view === Views.DAY
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView(Views.AGENDA)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              view === Views.AGENDA
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    )
  }, [view])

  useEffect(() => {
    // Always fetch reservations on component mount
    fetchReservations()
  }, [fetchReservations])

  // Convert reservations to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map((reservation) => {
      const startDate = new Date(`${reservation.date}T${reservation.time}`)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour duration

      return {
        id: reservation.id,
        title: `${reservation.customer_name} (Table ${reservation.table_number})`,
        start: startDate,
        end: endDate,
        resource: reservation,
      }
    })
  }, [reservations])

  // Handle event selection (clicking on a reservation)
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    onSelectEvent?.(event.resource)
  }, [onSelectEvent])

  // Handle slot selection (clicking on empty calendar slot)
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    onSelectSlot?.(slotInfo)
  }, [onSelectSlot])

  // Custom event style based on reservation status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { status } = event.resource
    let backgroundColor = '#3174ad'
    
    switch (status) {
      case 'confirmed':
        backgroundColor = '#10b981' // green
        break
      case 'pending':
        backgroundColor = '#f59e0b' // yellow
        break
      case 'cancelled':
        backgroundColor = '#ef4444' // red
        break
      default:
        backgroundColor = '#6b7280' // gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        padding: '2px 4px'
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Loading calendar...</div>
      </div>
    )
  }

  // Show calendar even without auth, but with limited functionality
  const isAuthenticated = user && tenantId
  const hasSupabase = !!supabase

  return (
    <div className="h-full">
      {/* CSS Styles for react-big-calendar */}
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          background-color: #f8fafc;
          padding: 8px;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }
        .rbc-today {
          background-color: #dbeafe;
        }
        .rbc-off-range-bg {
          background-color: #f8fafc;
        }
        .rbc-event {
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 12px;
          border: none;
        }
        .rbc-event-content {
          font-weight: 500;
        }
        .rbc-time-view .rbc-time-gutter {
          background-color: #f8fafc;
        }
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #e5e7eb;
        }
        .rbc-current-time-indicator {
          background-color: #ef4444;
        }
      `}</style>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Restaurant Reservations Calendar</h3>
        <p className="text-sm text-gray-600">
          {isAuthenticated && hasSupabase 
            ? "Live reservations loaded. Click on events to edit, or click empty slots to create new reservations."
            : !hasSupabase 
              ? "Demo mode: Supabase not configured. Sample reservations shown."
              : "Demo mode: Please log in for full functionality. Sample reservations shown."
          }
        </p>
      </div>
      
      <div style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
          }}
          step={30}
          timeslots={2}
          min={new Date(2000, 1, 1, 8, 0, 0)} // 8 AM
          max={new Date(2000, 1, 1, 23, 0, 0)} // 11 PM
          formats={{
            timeGutterFormat: 'h:mm a',
            eventTimeRangeFormat: ({ start, end }) =>
              `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
          }}
        />
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  )
}