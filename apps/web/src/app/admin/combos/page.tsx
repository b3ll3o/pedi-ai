'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getSession } from '@/lib/supabase/auth';
import type { combos, combo_items, products } from '@/lib/supabase/types';
import { ComboForm, type ComboInput } from '@/components/admin/ComboForm';
import styles from './page.module.css';

interface ComboWithItems extends combos {
  combo_items?: (combo_items & { product?: products })[];
}

export default function CombosPage() {
  const router = useRouter();
  const [combos, setCombos] = useState<ComboWithItems[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboWithItems | null>(null);
  const [_isSubmitting, setIsSubmitting] = useState(false);

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

  const fetchCombos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/combos');
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Falha ao carregar' }));
        throw new Error(data.error || 'Falha ao carregar');
      }
      const data = await response.json();
      setCombos(data.combos || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar combos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(
          data.products?.map((p: products) => ({ id: p.id, name: p.name, price: p.price })) || []
        );
      }
    } catch {
      // Silently fail - products are optional for the form
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    const loadData = async () => {
      await fetchCombos();
      await fetchProducts();
    };
    loadData();
  }, [authChecked, fetchCombos, fetchProducts]);

  const handleEdit = useCallback((combo: ComboWithItems) => {
    setEditingCombo(combo);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir este combo?')) {
        return;
      }

      try {
        const response = await fetch(`/api/admin/combos/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Falha ao excluir' }));
          throw new Error(data.error || 'Falha ao excluir');
        }
        await fetchCombos();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir';
        alert(message);
      }
    },
    [fetchCombos]
  );

  const handleToggleAvailability = useCallback(
    async (combo: ComboWithItems) => {
      try {
        const response = await fetch(`/api/admin/combos/${combo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ available: !combo.available }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Falha ao atualizar' }));
          throw new Error(data.error || 'Falha ao atualizar');
        }
        await fetchCombos();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar';
        alert(message);
      }
    },
    [fetchCombos]
  );

  const handleCreate = useCallback(() => {
    setEditingCombo(null);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingCombo(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: ComboInput) => {
      setIsSubmitting(true);
      try {
        if (editingCombo) {
          // Update combo
          const response = await fetch(`/api/admin/combos/${editingCombo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              description: data.description,
              bundle_price: data.bundle_price,
              available: data.available,
              product_ids: data.product_ids,
            }),
          });

          if (!response.ok) {
            const resp = await response.json().catch(() => ({ error: 'Falha ao atualizar' }));
            throw new Error(resp.error || 'Falha ao atualizar combo');
          }
        } else {
          // Create combo
          const response = await fetch('/api/admin/combos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              description: data.description,
              bundle_price: data.bundle_price,
              product_ids: data.product_ids,
            }),
          });

          if (!response.ok) {
            const resp = await response.json().catch(() => ({ error: 'Falha ao criar' }));
            throw new Error(resp.error || 'Falha ao criar combo');
          }
        }

        handleCloseModal();
        await fetchCombos();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao salvar';
        alert(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingCombo, handleCloseModal, fetchCombos]
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getProductCount = (combo: ComboWithItems) => {
    return combo.combo_items?.length || 0;
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
            <p className={styles.subtitle}>Gerencie os combos do cardápio</p>
          </div>

          <button type="button" className={styles.createButton} onClick={handleCreate}>
            + Novo Combo
          </button>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} aria-label="Carregando..." />
          </div>
        ) : (
          <div className={styles.list}>
            {combos.length === 0 ? (
              <div className={styles.empty}>
                <p>Nenhum combo encontrado.</p>
                <button type="button" onClick={handleCreate} className={styles.emptyButton}>
                  Criar primeiro combo
                </button>
              </div>
            ) : (
              combos.map((combo) => (
                <div key={combo.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemHeader}>
                      <h3 className={styles.itemName}>{combo.name}</h3>
                      <span
                        className={`${styles.badge} ${combo.available ? styles.badgeAvailable : styles.badgeUnavailable}`}
                      >
                        {combo.available ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>
                    {combo.description && (
                      <p className={styles.itemDescription}>{combo.description}</p>
                    )}
                    <p className={styles.itemPrice}>
                      Preço: {formatPrice(combo.bundle_price)} • {getProductCount(combo)} produtos
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

        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <ComboForm
                combo={editingCombo || undefined}
                products={products}
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
