'use client'

import { useState, useCallback } from 'react'
import type { tables } from '@/lib/supabase/types'
import styles from './TableManagement.module.css'

interface TableManagementProps {
  tables: tables[]
  onEdit: (table: tables) => void
  onDelete: (id: string) => void
  onGenerateQR: (table: tables) => void
  onToggleActive: (table: tables) => void
}

export function TableManagement({
  tables,
  onEdit,
  onDelete,
  onGenerateQR,
  onToggleActive,
}: TableManagementProps) {
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = tables.filter((table) => {
    const matchesSearch =
      table.name?.toLowerCase().includes(search.toLowerCase()) ||
      `Mesa ${table.number}`.toLowerCase().includes(search.toLowerCase()) ||
      table.number.toString().includes(search)

    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && table.active) ||
      (filterActive === 'inactive' && !table.active)

    return matchesSearch && matchesFilter
  })

  const handleDelete = useCallback(
    (table: tables) => {
      if (confirm(`Tem certeza que deseja excluir a Mesa ${table.number}?`)) {
        onDelete(table.id)
      }
    },
    [onDelete]
  )

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Buscar mesas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar mesas"
        />
        <select
          className={styles.filter}
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
          aria-label="Filtrar por status"
        >
          <option value="all">Todas</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🪑</span>
          <p>Nenhuma mesa encontrada</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((table) => (
            <div
              key={table.id}
              className={`${styles.card} ${!table.active ? styles.inactive : ''}`}
            >
              <div className={styles.cardHeader}>
                <span className={styles.tableNumber}>Mesa {table.number}</span>
                <span
                  className={`${styles.badge} ${table.active ? styles.active : styles.inactive}`}
                >
                  {table.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              {table.name && (
                <span className={styles.tableName}>{table.name}</span>
              )}

              {table.capacity && (
                <span className={styles.capacity}>
                  Capacidade: {table.capacity} {table.capacity === 1 ? 'pessoa' : 'pessoas'}
                </span>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={() => onToggleActive(table)}
                  title={table.active ? 'Desativar mesa' : 'Ativar mesa'}
                >
                  {table.active ? '⏸️' : '▶️'}
                </button>
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={() => onGenerateQR(table)}
                  title="Gerar QR Code"
                >
                  📱
                </button>
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={() => onEdit(table)}
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className={`${styles.btnIcon} ${styles.btnDelete}`}
                  onClick={() => handleDelete(table)}
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.summary}>
        Mostrando {filtered.length} de {tables.length} mesas
      </div>
    </div>
  )
}
