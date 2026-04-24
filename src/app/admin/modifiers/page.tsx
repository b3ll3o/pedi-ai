'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getSession } from '@/lib/supabase/auth';
import type { modifier_groups, modifier_values } from '@/lib/supabase/types';
import { ModifierGroupForm, type ModifierGroupInput, type ModifierValueInput } from '@/components/admin/ModifierGroupForm';
import styles from './page.module.css';

interface ModifierGroupWithValues extends modifier_groups {
  modifier_values?: modifier_values[];
}

export default function ModifiersPage() {
  const router = useRouter();
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupWithValues[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroupWithValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchModifierGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/modifiers');
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Falha ao carregar' }));
        throw new Error(data.error || 'Falha ao carregar');
      }
      const data = await response.json();
      setModifierGroups(data.modifier_groups || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar grupos';
      setError(message);
    } finally {
      setIsLoading(false);
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
        setIsLoading(true);
        await fetchModifierGroups();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router, fetchModifierGroups]);

  const handleEdit = useCallback((group: ModifierGroupWithValues) => {
    setEditingGroup(group);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo de modificadores?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/modifiers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Falha ao excluir' }));
        throw new Error(data.error || 'Falha ao excluir');
      }
      await fetchModifierGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir';
      alert(message);
    }
  }, [fetchModifierGroups]);

  const handleCreate = useCallback(() => {
    setEditingGroup(null);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingGroup(null);
  }, []);

  // Helper to sync modifier values (for edit mode)
  const syncModifierValues = async (groupId: string, newValues: ModifierValueInput[]) => {
    const existingValues = editingGroup?.modifier_values || [];

    // Delete values that are no longer present
    for (const existing of existingValues) {
      const stillExists = newValues.some((v) => v.id === existing.id);
      if (!stillExists) {
        await fetch(`/api/admin/modifiers/values/${existing.id}`, { method: 'DELETE' });
      }
    }

    // Update or create values
    for (const newVal of newValues) {
      if (newVal.id) {
        // This value came from DB - update it
        await fetch(`/api/admin/modifiers/values/${newVal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newVal.name,
            price_adjustment: newVal.price_adjustment,
          }),
        });
      } else {
        // This is a new value (has tempId but no real id) - create it
        await fetch(`/api/admin/modifiers/${groupId}/values`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newVal.name,
            price_adjustment: newVal.price_adjustment,
          }),
        });
      }
    }
  };

  const handleSubmit = useCallback(async (data: ModifierGroupInput) => {
    setIsSubmitting(true);
    try {
      if (editingGroup) {
        // Update modifier group
        const groupResponse = await fetch(`/api/admin/modifiers/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            required: data.required,
            min_selections: data.min_selections,
            max_selections: data.max_selections,
          }),
        });

        if (!groupResponse.ok) {
          const resp = await groupResponse.json().catch(() => ({ error: 'Falha ao atualizar' }));
          throw new Error(resp.error || 'Falha ao atualizar grupo');
        }

        // Sync modifier values
        await syncModifierValues(editingGroup.id, data.values || []);
      } else {
        // Create modifier group
        const groupResponse = await fetch('/api/admin/modifiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            required: data.required,
            min_selections: data.min_selections,
            max_selections: data.max_selections,
          }),
        });

        if (!groupResponse.ok) {
          const resp = await groupResponse.json().catch(() => ({ error: 'Falha ao criar' }));
          throw new Error(resp.error || 'Falha ao criar grupo');
        }

        const { modifier_group } = await groupResponse.json();

        // Create modifier values
        if (data.values && data.values.length > 0) {
          for (const value of data.values) {
            const valueResponse = await fetch(`/api/admin/modifiers/${modifier_group.id}/values`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: value.name,
                price_adjustment: value.price_adjustment,
              }),
            });
            if (!valueResponse.ok) {
              console.error('Erro ao criar valor do modificador');
            }
          }
        }
      }

      handleCloseModal();
      await fetchModifierGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingGroup, handleCloseModal, fetchModifierGroups]);

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Modificadores</h1>
            <p className={styles.subtitle}>
              Gerencie os grupos de modificadores
            </p>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={handleCreate}
          >
            + Novo Grupo
          </button>
        </header>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} aria-label="Carregando..." />
          </div>
        ) : (
          <div className={styles.list}>
            {modifierGroups.length === 0 ? (
              <div className={styles.empty}>
                <p>Nenhum grupo de modificadores encontrado.</p>
                <button
                  type="button"
                  onClick={handleCreate}
                  className={styles.emptyButton}
                >
                  Criar primeiro grupo
                </button>
              </div>
            ) : (
              modifierGroups.map((group) => (
                <div key={group.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{group.name}</h3>
                    <p className={styles.itemMeta}>
                      {group.required ? 'Obrigatório' : 'Opcional'} •{' '}
                      {group.min_selections}–{group.max_selections} opções
                      {group.modifier_values && group.modifier_values.length > 0 && (
                        <> • {group.modifier_values.length} valores</>
                      )}
                    </p>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      onClick={() => handleEdit(group)}
                      className={styles.editButton}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(group.id)}
                      className={styles.deleteButton}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <ModifierGroupForm
                modifierGroup={editingGroup || undefined}
                modifierValues={editingGroup?.modifier_values}
                onSubmit={handleSubmit}
                onCancel={handleCloseModal}
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}