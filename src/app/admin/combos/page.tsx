'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getSession } from '@/lib/supabase/auth';
import type { combos } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function CombosPage() {
  const router = useRouter();
  const [combos, setCombos] = useState<combos[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleEdit = useCallback((combo: combos) => {
    // TODO: Open edit modal or navigate to edit page
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // TODO: Implement delete with confirmation
  }, []);

  const handleToggleAvailability = useCallback((combo: combos) => {
    // TODO: Implement toggle availability API call
  }, []);

  const handleCreate = useCallback(() => {
    // TODO: Open create modal or navigate to create page
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (!authChecked) {
    return (
      <AdminLayout>
        <div className={styles.container}>
          <div className={styles.loading}>Carregando...</div>
        </div>
      </AdminLayout>
    );
  }

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