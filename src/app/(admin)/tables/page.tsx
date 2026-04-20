'use client'

import { useState, useCallback } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { TableManagement } from '@/components/admin/TableManagement'
import { TableQRCode } from '@/components/admin/TableQRCode'
import type { tables } from '@/lib/supabase/types'
import { getTables, createTable, updateTable, deleteTable, generateTableQR } from '@/services/tableService'
import styles from './page.module.css'

export default function TablesPage() {
  const [tables, setTables] = useState<tables[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<tables | null>(null)
  const [qrData, setQrData] = useState<{ table: tables; qrData: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTable, setEditingTable] = useState<tables | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    capacity: '',
  })

  // Load tables on mount
  useState(() => {
    const loadTables = async () => {
      try {
        // In a real app, get restaurantId from auth context
        const restaurantId = 'demo-restaurant'
        const data = await getTables(restaurantId)
        setTables(data)
      } catch (error) {
        console.error('Failed to load tables:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTables()
  })

  const handleEdit = useCallback((table: tables) => {
    setEditingTable(table)
    setFormData({
      number: table.number.toString(),
      name: table.name || '',
      capacity: table.capacity?.toString() || '',
    })
    setShowForm(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteTable(id)
      setTables((prev) => prev.filter((t) => t.id !== id))
    } catch (error) {
      console.error('Failed to delete table:', error)
      alert('Erro ao excluir mesa')
    }
  }, [])

  const handleGenerateQR = useCallback(async (table: tables) => {
    try {
      const result = await generateTableQR(table.id)
      setQrData({
        table,
        qrData: result.qr_data,
      })
    } catch (error) {
      console.error('Failed to generate QR:', error)
      alert('Erro ao gerar QR code')
    }
  }, [])

  const handleToggleActive = useCallback(async (table: tables) => {
    try {
      const updated = await updateTable(table.id, { active: !table.active })
      setTables((prev) => prev.map((t) => (t.id === table.id ? updated : t)))
    } catch (error) {
      console.error('Failed to toggle active:', error)
      alert('Erro ao atualizar mesa')
    }
  }, [])

  const handleCreate = useCallback(() => {
    setEditingTable(null)
    setFormData({ number: '', name: '', capacity: '' })
    setShowForm(true)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        const data = {
          number: parseInt(formData.number, 10),
          name: formData.name || undefined,
          capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
          active: true,
        }

        if (editingTable) {
          const updated = await updateTable(editingTable.id, data)
          setTables((prev) => prev.map((t) => (t.id === editingTable.id ? updated : t)))
        } else {
          const restaurantId = 'demo-restaurant'
          const created = await createTable({ ...data, restaurant_id: restaurantId })
          setTables((prev) => [...prev, created])
        }
        setShowForm(false)
      } catch (error) {
        console.error('Failed to save table:', error)
        alert('Erro ao salvar mesa')
      }
    },
    [formData, editingTable]
  )

  const handleCancelForm = useCallback(() => {
    setShowForm(false)
    setEditingTable(null)
  }, [])

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Mesas</h1>
            <p className={styles.subtitle}>Gerencie as mesas do restaurante</p>
          </div>
          <button type="button" className={styles.createButton} onClick={handleCreate}>
            + Nova Mesa
          </button>
        </header>

        {isLoading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : (
          <TableManagement
            tables={tables}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onGenerateQR={handleGenerateQR}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      {/* QR Code Modal */}
      {qrData && (
        <TableQRCode
          table={qrData.table}
          qrData={qrData.qrData}
          onClose={() => setQrData(null)}
        />
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className={styles.formOverlay} onClick={handleCancelForm}>
          <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.formTitle}>
              {editingTable ? 'Editar Mesa' : 'Nova Mesa'}
            </h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formField}>
                <label htmlFor="number">Número da Mesa *</label>
                <input
                  type="number"
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, number: e.target.value }))}
                  required
                  min="1"
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="name">Nome (opcional)</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Terraço, Varanda..."
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="capacity">Capacidade (opcional)</label>
                <input
                  type="number"
                  id="capacity"
                  value={formData.capacity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                  min="1"
                  placeholder="Número de lugares"
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={handleCancelForm}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submitButton}>
                  {editingTable ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
