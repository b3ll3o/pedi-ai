'use client';

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { modifier_groups } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function ModifiersPage() {
  const [modifierGroups, setModifierGroups] = useState<modifier_groups[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = useCallback((group: modifier_groups) => {
    // TODO: Open edit modal or navigate to edit page
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // TODO: Implement delete with confirmation
  }, []);

  const handleCreate = useCallback(() => {
    // TODO: Open create modal or navigate to create page
  }, []);

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
      </div>
    </AdminLayout>
  );
}