'use client';

import styles from './CartSummary.module.css';

export interface CartSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  onCheckout: () => void;
  isLoading?: boolean;
}

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CartSummary({
  subtotal,
  tax,
  total,
  itemCount,
  onCheckout,
  isLoading = false,
}: CartSummaryProps) {
  return (
    <div className={styles.summary}>
      <div className={styles.row}>
        <span className={styles.label}>Subtotal</span>
        <span className={styles.value}>{formatPrice(subtotal)}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Taxa de serviço</span>
        <span className={styles.value}>{formatPrice(tax)}</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.row}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalValue}>{formatPrice(total)}</span>
      </div>

      <p className={styles.itemCount}>
        {itemCount} iten{itemCount !== 1 ? 's' : ''}
      </p>

      <button
        className={styles.checkoutButton}
        onClick={onCheckout}
        disabled={isLoading || itemCount === 0}
        type="button"
      >
        {isLoading ? 'Carregando...' : 'Finalizar Pedido'}
      </button>
    </div>
  );
}
