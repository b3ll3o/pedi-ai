'use client';

import type { TableDTO } from '@pedi-ai/shared/types';
import { useState, useCallback } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import styles from './TableManagement.module.css';

interface TableManagementProps {
  tables: TableDTO[];
  onEdit: (table: TableDTO) => void;
  onDelete: (id: string) => void;
  onGenerateQR: (table: TableDTO) => void;
  onToggleActive: (table: TableDTO) => void;
}

export function TableManagement({
  tables,
  onEdit,
  onDelete,
  onGenerateQR,
  onToggleActive,
}: TableManagementProps) {
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [pendingDelete, setPendingDelete] = useState<TableDTO | null>(null);

  const filtered = tables.filter((table) => {
    const matchesSearch =
      table.name?.toLowerCase().includes(search.toLowerCase()) ||
      `Mesa ${table.number}`.toLowerCase().includes(search.toLowerCase()) ||
      table.number.toString().includes(search);

    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && table.active) ||
      (filterActive === 'inactive' && !table.active);

    return matchesSearch && matchesFilter;
  });

  // S3#7: substituído window.confirm() por modal acessível.
  // O nativo bloqueia a thread JS, não é estilizável, e não respeita
  // prefers-reduced-motion; além disso, screen-readers perdem o
  // contexto ao alternar entre foco do browser e o app.
  const requestDelete = useCallback((table: TableDTO) => {
    setPendingDelete(table);
  }, []);

  const confirmDelete = useCallback(() => {
    if (pendingDelete) {
      onDelete(pendingDelete.id);
      setPendingDelete(null);
    }
  }, [pendingDelete, onDelete]);

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
              data-testid="table-item"
            >
              <div className={styles.cardHeader}>
                <span className={styles.tableNumber}>Mesa {table.number}</span>
                <span
                  className={`${styles.badge} ${table.active ? styles.active : styles.inactive}`}
                >
                  {table.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              {table.name && <span className={styles.tableName}>{table.name}</span>}

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
                  data-testid="generate-qr-button"
                >
                  📱
                </button>
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={() => onEdit(table)}
                  title="Editar"
                  data-testid="edit-button"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className={`${styles.btnIcon} ${styles.btnDelete}`}
                  onClick={() => requestDelete(table)}
                  title="Excluir"
                  data-testid="delete-button"
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir mesa"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir a Mesa ${pendingDelete.number}? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
