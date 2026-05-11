'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import styles from './page.module.css';

const TAX_RATE = 0.1;

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const total = subtotal + tax;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          total,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar pedido');
      }

      const order = await response.json();
      clearCart();
      router.push(`/pedido/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido');
    } finally {
      setIsSubmitting(false);
    }
  }, [items, total, clearCart, router]);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Resumo do pedido</h2>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Taxa de serviço</span>
          <span>R$ {tax.toFixed(2).replace('.', ',')}</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.total}`}>
          <span>Total</span>
          <span>R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Enviando...' : 'Enviar Pedido'}
      </button>
    </form>
  );
}