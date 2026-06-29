'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, List, Table2, Plus, ArrowLeft } from 'lucide-react'
import { useDemo } from '@/contexts/DemoContext'
import { Reservation } from '@/types/reservation'
import ReservationModal from '@/components/ReservationModal'
import ReservationRow from '@/components/ReservationRow'
import EnhancedCalendar from '@/components/EnhancedCalendar'
import TableManagementPanel from '@/components/TableManagementPanel'
import { useI18n } from '@/contexts/I18nContext'
import ConfirmDialog from '@/components/ConfirmDialog'

type Tab = 'list' | 'calendar' | 'tables'

export default function DemoPage() {
  const {
    reservations,
    tables,
    addReservation,
    updateReservation,
    deleteReservation,
    addTable,
    updateTable,
    deleteTable,
  } = useDemo()
  const { messages } = useI18n()
  const t = messages.dashboard
  const st = messages.setupPage
  const dt = messages.demo

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Table management state
  const [newTableIdentifier, setNewTableIdentifier] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editIdentifier, setEditIdentifier] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [tableError, setTableError] = useState('')

  const openNew = () => {
    setSelectedReservation(null)
    setSelectedSlot(null)
    setIsModalOpen(true)
  }

  const openEdit = (r: Reservation) => {
    setSelectedReservation(r)
    setSelectedSlot(null)
    setIsModalOpen(true)
  }

  const openSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedReservation(null)
    setSelectedSlot(slotInfo)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReservation(null)
    setSelectedSlot(null)
  }

  // Table handlers
  const handleAddTable = () => {
    if (!newTableIdentifier.trim() || !newTableCapacity) {
      setTableError(st.errors.enterIdentifierAndCapacity)
      return
    }
    const capacity = parseInt(newTableCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setTableError(st.errors.capacityPositive)
      return
    }
    if (
      tables.some(
        tbl =>
          tbl.table_identifier.toLowerCase() ===
          newTableIdentifier.trim().toLowerCase()
      )
    ) {
      setTableError(st.errors.duplicateIdentifier)
      return
    }
    setTableError('')
    addTable(newTableIdentifier.trim(), capacity)
    setNewTableIdentifier('')
    setNewTableCapacity('')
  }

  const handleUpdateTable = (id: string) => {
    if (!editIdentifier.trim() || !editCapacity) {
      setTableError(st.errors.enterIdentifierAndCapacity)
      return
    }
    const capacity = parseInt(editCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setTableError(st.errors.capacityPositive)
      return
    }
    setTableError('')
    updateTable(id, { table_identifier: editIdentifier.trim(), capacity })
    setEditingId(null)
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: t.reservations, icon: <List className="h-4 w-4" /> },
    {
      id: 'calendar',
      label: messages.calendarPage.title,
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      id: 'tables',
      label: st.title,
      icon: <Table2 className="h-4 w-4" />,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        title={st.confirmDeleteTitle}
        message={st.confirmDelete}
        confirmLabel={messages.common.delete}
        danger
        onConfirm={() => {
          if (pendingDeleteId) deleteTable(pendingDeleteId)
          setPendingDeleteId(null)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
      {/* Nav */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label={dt.backToHome}
                title={dt.backToHome}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>
            </div>
            <button
              onClick={openNew}
              className="inline-flex whitespace-nowrap items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t.newReservation}
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* LIST TAB */}
        {activeTab === 'list' && (
          <div>
            {reservations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 mb-3">{t.noReservations}</p>
                <button
                  onClick={openNew}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {t.createFirstReservation}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {reservations.map(r => (
                    <ReservationRow
                      key={r.id}
                      reservation={r}
                      onEdit={openEdit}
                      showDate
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <EnhancedCalendar
              demoReservations={reservations}
              onSelectEvent={r => openEdit(r)}
              onSelectSlot={openSlot}
            />
          </div>
        )}

        {/* TABLES TAB */}
        {activeTab === 'tables' && (
          <TableManagementPanel
            tables={tables}
            saving={false}
            error={tableError}
            newIdentifier={newTableIdentifier}
            newCapacity={newTableCapacity}
            editingId={editingId}
            editIdentifier={editIdentifier}
            editCapacity={editCapacity}
            onNewIdentifierChange={setNewTableIdentifier}
            onNewCapacityChange={setNewTableCapacity}
            onAdd={handleAddTable}
            onEdit={table => {
              setEditingId(table.id)
              setEditIdentifier(table.table_identifier)
              setEditCapacity(table.capacity.toString())
              setTableError('')
            }}
            onEditIdentifierChange={setEditIdentifier}
            onEditCapacityChange={setEditCapacity}
            onSave={handleUpdateTable}
            onCancel={() => {
              setEditingId(null)
              setEditIdentifier('')
              setEditCapacity('')
              setTableError('')
            }}
            onDelete={id => setPendingDeleteId(id)}
            onToggleActive={(id, isActive) =>
              updateTable(id, { is_active: !isActive })
            }
          />
        )}
      </main>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        reservation={selectedReservation}
        selectedDate={selectedSlot?.start}
        selectedTime={
          selectedSlot
            ? `${String(selectedSlot.start.getHours()).padStart(2, '0')}:${String(selectedSlot.start.getMinutes()).padStart(2, '0')}`
            : undefined
        }
        onSave={saved => {
          if (selectedReservation) {
            updateReservation(selectedReservation.id, saved)
          }
        }}
        onDelete={id => deleteReservation(id)}
        demoTables={tables}
        demoReservations={reservations}
        onDemoSave={data => {
          if (selectedReservation) {
            return updateReservation(selectedReservation.id, data)
          }
          return addReservation(data)
        }}
        onDemoDelete={id => deleteReservation(id)}
      />
    </div>
  )
}
