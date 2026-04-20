'use client';

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { combos } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function CombosPage() {
  const [combos, setCombos] = useState<combos[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = useCallback((combo: combos) => {
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit combo:', combo);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // TODO: Implement delete with confirmation
    console.log('Delete combo:', id);
  }, []);

  const handleToggleAvailability = useCallback((combo: combos) => {
    // TODO: Implement toggle availability API call
    console.log('Toggle availability:', combo);
  }, []);

  const handleCreate = useCallback(() => {
    // TODO: Open create modal or navigate to create page
    console.log('Create new combo');
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Combos</h1>
            <p className={styles.subtitle}>
              Gerencie os combos do cardápio
            </p>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={handleCreate}
          >
            + Novo Combo
          </button>
        </header>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} aria-label="Carregando..." />
          </div>
        ) : (
          <div className={styles.list}>
            {combos.length === 0 ? (
              <div className={styles.empty}>
                <p>Nenhum combo encontrado.</p>
                <button
                  type="button"
                  onClick={handleCreate}
                  className={styles.emptyButton}
                >
                  Criar primeiro combo
                </button>
              </div>
            ) : (
              combos.map((combo) => (
                <div key={combo.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemHeader}>
                      <h3 className={styles.itemName}>{combo.name}</h3>
                      <span className={`${styles.badge} ${combo.available ? styles.badgeAvailable : styles.badgeUnavailable}`}>
                        {combo.available ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>
                    {combo.description && (
                      <p className={styles.itemDescription}>{combo.description}</p>
                    )}
                    <p className={styles.itemPrice}>
                      Preço: {formatPrice(combo.bundle_price)}
                    </p>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(combo)}
                      className={combo.available ? styles.disableButton : styles.enableButton}
                    >
                      {combo.available ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(combo)}
                      className={styles.editButton}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(combo.id)}
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
