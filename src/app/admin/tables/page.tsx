'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { TableManagement } from '@/components/admin/TableManagement';
import { TableQRCode } from '@/components/admin/TableQRCode';
import type { tables } from '@/lib/supabase/types';
import styles from './page.module.css';

interface TableFormData {
  number: string;
  name: string;
  capacity: string;
  generateQr: boolean;
}

export default function TablesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<tables[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<tables | null>(null);
  const [selectedTable, setSelectedTable] = useState<tables | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<TableFormData>({
    number: '',
    name: '',
    capacity: '',
    generateQr: true,
  });

  const fetchTables = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/tables');
      if (!response.ok) {
        throw new Error('Falha ao carregar mesas');
      }
      const data = await response.json();
      setTables(data.tables || []);
    } catch (err) {
      console.error('Erro ao carregar mesas:', err);
      setError('Erro ao carregar mesas');
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        await fetchTables();
        setLoading(false);
      } catch (err) {
        console.error('Auth check failed:', err);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router, fetchTables]);

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      number: '',
      name: '',
      capacity: '',
      generateQr: true,
    });
    setEditingTable(null);
  }, []);

  const handleGenerateQR = useCallback(
    async (table: tables) => {
      try {
        const response = await fetch(`/api/admin/tables/${table.id}/qr`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Falha ao gerar QR code');
        }

        const data = await response.json();
        setSelectedTable(table);
        setQrData(data.qr_data);
        setIsQrModalOpen(true);
      } catch (err) {
        console.error('Erro ao gerar QR code:', err);
        showError(
          err instanceof Error ? err.message : 'Erro ao gerar QR code'
        );
      }
    },
    [showError]
  );

  const handleCreate = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parseInt(formData.number, 10),
          name: formData.name || null,
          capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
          active: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao criar mesa');
      }

      const data = await response.json();
      setTables((prev) => [...prev, data.table]);
      setIsModalOpen(false);
      resetForm();
      showSuccess(`Mesa ${data.table.number} criada com sucesso!`);

      // Generate QR if requested
      if (formData.generateQr && data.table.active) {
        await handleGenerateQR(data.table);
      }
    } catch (err) {
      console.error('Erro ao criar mesa:', err);
      showError(err instanceof Error ? err.message : 'Erro ao criar mesa');
    }
  }, [formData, showSuccess, showError, resetForm, handleGenerateQR]);

  const handleUpdate = useCallback(async () => {
    if (!editingTable) return;

    try {
      const response = await fetch(`/api/admin/tables/${editingTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parseInt(formData.number, 10),
          name: formData.name || null,
          capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao atualizar mesa');
      }

      const data = await response.json();
      setTables((prev) =>
        prev.map((t) => (t.id === editingTable.id ? data.table : t))
      );
      setEditingTable(null);
      setIsModalOpen(false);
      resetForm();
      showSuccess(`Mesa ${data.table.number} atualizada com sucesso!`);
    } catch (err) {
      console.error('Erro ao atualizar mesa:', err);
      showError(err instanceof Error ? err.message : 'Erro ao atualizar mesa');
    }
  }, [editingTable, formData, showSuccess, showError, resetForm]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/admin/tables/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Falha ao excluir mesa');
        }

        setTables((prev) => prev.filter((t) => t.id !== id));
        showSuccess('Mesa excluída com sucesso!');
      } catch (err) {
        console.error('Erro ao excluir mesa:', err);
        showError(
          err instanceof Error ? err.message : 'Erro ao excluir mesa'
        );
      }
    },
    [showSuccess, showError]
  );

  const handleToggleActive = useCallback(
    async (table: tables) => {
      if (!table.active) {
        // Reactivate
        try {
          const response = await fetch(
            `/api/admin/tables/${table.id}/reactivate`,
            { method: 'PATCH' }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Falha ao reativar mesa');
          }

          const data = await response.json();
          setTables((prev) =>
            prev.map((t) => (t.id === table.id ? data.table : t))
          );
          showSuccess(`Mesa ${table.number} reativada com sucesso!`);
        } catch (err) {
          console.error('Erro ao reativar mesa:', err);
          showError(
            err instanceof Error ? err.message : 'Erro ao reativar mesa'
          );
        }
      } else {
        // Soft delete - set active to false
        try {
          const response = await fetch(`/api/admin/tables/${table.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: false }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Falha ao desativar mesa');
          }

          const data = await response.json();
          setTables((prev) =>
            prev.map((t) => (t.id === table.id ? data.table : t))
          );
          showSuccess(`Mesa ${table.number} desativada com sucesso!`);
        } catch (err) {
          console.error('Erro ao desativar mesa:', err);
          showError(
            err instanceof Error ? err.message : 'Erro ao desativar mesa'
          );
        }
      }
    },
    [showSuccess, showError]
  );

  const handleEdit = useCallback(
    (table: tables) => {
      setEditingTable(table);
      setFormData({
        number: table.number.toString(),
        name: table.name || '',
        capacity: table.capacity?.toString() || '',
        generateQr: false,
      });
      setIsModalOpen(true);
    },
    []
  );

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 data-testid="page-title" className={styles.title}>
          Mesas
        </h1>
        <div className={styles.actions}>
          <button
            data-testid="add-table-button"
            className={styles.addButton}
            onClick={openCreateModal}
          >
            Adicionar Mesa
          </button>
        </div>
      </header>

      {success && (
        <div data-testid="success-message" className={styles.successMessage}>
          {success}
        </div>
      )}
      {error && (
        <div data-testid="error-message" className={styles.errorMessage}>
          {error}
        </div>
      )}

      <TableManagement
        tables={tables}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onGenerateQR={handleGenerateQR}
        onToggleActive={handleToggleActive}
      />

      {/* Modal de adição/edição de mesa */}
      {!isQrModalOpen && (
        <div
          data-testid="table-form-modal"
          className={styles.modal}
          hidden={!isModalOpen}
        >
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {editingTable ? 'Editar Mesa' : 'Nova Mesa'}
            </h2>

            <div className={styles.formGroup}>
              <label htmlFor="table-number">Número da mesa *</label>
              <input
                id="table-number"
                data-testid="table-name-input"
                type="number"
                min="1"
                value={formData.number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, number: e.target.value }))
                }
                placeholder="Ex: 1"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="table-name-label">Nome (opcional)</label>
              <input
                id="table-name-label"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Mesa do canto"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="table-capacity">Capacidade (opcional)</label>
              <input
                id="table-capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    capacity: e.target.value,
                  }))
                }
                placeholder="Ex: 4"
              />
            </div>

            {!editingTable && (
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    data-testid="generate-qr-checkbox"
                    type="checkbox"
                    checked={formData.generateQr}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        generateQr: e.target.checked,
                      }))
                    }
                  />
                  <span>Gerar QR Code</span>
                </label>
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                data-testid="save-button"
                className={styles.saveButton}
                onClick={editingTable ? handleUpdate : handleCreate}
                disabled={!formData.number}
              >
                {editingTable ? 'Salvar' : 'Criar Mesa'}
              </button>
              <button
                data-testid="cancel-button"
                className={styles.cancelButton}
                onClick={closeModal}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR Code */}
      {isQrModalOpen && selectedTable && (
        <TableQRCode
          table={selectedTable}
          qrData={qrData || undefined}
          onClose={() => {
            setIsQrModalOpen(false);
            setSelectedTable(null);
            setQrData(null);
          }}
          onDownload={() => {
            showSuccess('QR Code baixado com sucesso!');
          }}
        />
      )}
    </div>
  );
}