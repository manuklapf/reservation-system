'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Table = {
  id: string
  table_identifier: string
  capacity: number
  is_active: boolean
}

export default function TableSetupPage() {
  const { user, tenantId } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newTableIdentifier, setNewTableIdentifier] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editIdentifier, setEditIdentifier] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [error, setError] = useState('')

  const fetchTables = useCallback(async () => {
    if (!supabase || !tenantId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('table_identifier')

      if (error) throw error
      setTables(data || [])
    } catch (err: any) {
      console.error('Error fetching tables:', err)

      // Check if tables table doesn't exist
      if (
        err?.code === '42P01' ||
        err?.message?.includes('relation "tables" does not exist')
      ) {
        setError(
          '⚠️ Database setup required! Please run supabase-tables-schema.sql in your Supabase SQL Editor first.'
        )
      } else {
        setError('Failed to load tables: ' + (err?.message || 'Unknown error'))
      }
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (user && tenantId) {
      fetchTables()
    }
  }, [user, tenantId, fetchTables])

  const handleAddTable = async () => {
    if (!supabase) return
    if (!newTableIdentifier.trim() || !newTableCapacity) {
      setError('Please enter table identifier and capacity')
      return
    }

    const capacity = parseInt(newTableCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setError('Capacity must be a positive number')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase.from('tables').insert({
        tenant_id: tenantId,
        table_identifier: newTableIdentifier.trim(),
        capacity: capacity,
        is_active: true,
      })

      if (error) throw error

      setNewTableIdentifier('')
      setNewTableCapacity('')
      await fetchTables()
    } catch (err: any) {
      console.error('Error adding table:', err)
      if (err.message?.includes('duplicate')) {
        setError('A table with this identifier already exists')
      } else {
        setError('Failed to add table')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTable = async (id: string) => {
    if (!supabase) return

    if (!editIdentifier.trim() || !editCapacity) {
      setError('Please enter table identifier and capacity')
      return
    }

    const capacity = parseInt(editCapacity)
    if (isNaN(capacity) || capacity <= 0) {
      setError('Capacity must be a positive number')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase
        .from('tables')
        .update({
          table_identifier: editIdentifier.trim(),
          capacity: capacity,
        })
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      setEditIdentifier('')
      setEditCapacity('')
      await fetchTables()
    } catch (err: any) {
      console.error('Error updating table:', err)
      if (err.message?.includes('duplicate')) {
        setError('A table with this identifier already exists')
      } else {
        setError('Failed to update table')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!supabase) return

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase
        .from('tables')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      await fetchTables()
    } catch (err) {
      console.error('Error toggling table status:', err)
      setError('Failed to update table status')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTable = async (id: string) => {
    if (!supabase) return
    if (!confirm('Are you sure you want to delete this table?')) return

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase.from('tables').delete().eq('id', id)

      if (error) throw error

      await fetchTables()
    } catch (err) {
      console.error('Error deleting table:', err)
      setError('Failed to delete table')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (table: Table) => {
    setEditingId(table.id)
    setEditIdentifier(table.table_identifier)
    setEditCapacity(table.capacity.toString())
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditIdentifier('')
    setEditCapacity('')
    setError('')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please log in to access this page.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Table Setup</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Add New Table Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Table</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Table identifier (e.g., A1, 12, Window-1)"
              value={newTableIdentifier}
              onChange={e => setNewTableIdentifier(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
            <input
              type="number"
              placeholder="Capacity"
              value={newTableCapacity}
              onChange={e => setNewTableCapacity(e.target.value)}
              className="w-full sm:w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
              min="1"
            />
            <button
              onClick={handleAddTable}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : 'Add Table'}
            </button>
          </div>
        </div>

        {/* Tables List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Your Tables</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading tables...
            </div>
          ) : tables.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tables yet. Add your first table above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tables.map(table => (
                    <tr key={table.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === table.id ? (
                          <input
                            type="text"
                            value={editIdentifier}
                            onChange={e => setEditIdentifier(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={saving}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {table.table_identifier}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === table.id ? (
                          <input
                            type="number"
                            value={editCapacity}
                            onChange={e => setEditCapacity(e.target.value)}
                            className="w-20 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={saving}
                            min="1"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">
                            {table.capacity} people
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            table.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {table.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === table.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateTable(table.id)}
                              disabled={saving}
                              className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(table)}
                              disabled={saving}
                              className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleToggleActive(table.id, table.is_active)
                              }
                              disabled={saving}
                              className="text-yellow-600 hover:text-yellow-900 disabled:text-gray-400"
                            >
                              {table.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteTable(table.id)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
