'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import styles from './page.module.css';

const TAX_RATE = 0.1; // 10% service tax

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  const tax = useMemo(() => {
    return subtotal * TAX_RATE;
  }, [subtotal]);

  const total = subtotal + tax;

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => {
    updateQuantity(id, qty);
  }, [updateQuantity]);

  const handleRemove = useCallback((id: string) => {
    removeItem(id);
  }, [removeItem]);

  const handleClearCart = useCallback(() => {
    if (window.confirm('Tem certeza que deseja limpar o carrinho?')) {
      clearCart();
    }
  }, [clearCart]);

  const handleCheckout = useCallback(() => {
    router.push('/checkout');
  }, [router]);

  const handleBackToMenu = useCallback(() => {
    router.push('/menu');
  }, [router]);

  const isEmpty = items.length === 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={handleBackToMenu}
          aria-label="Voltar ao cardápio"
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={styles.title}>Seu Pedido</h1>
        {!isEmpty && (
          <button
            className={styles.clearButton}
            onClick={handleClearCart}
            aria-label="Limpar carrinho"
            type="button"
          >
            Limpar
          </button>
        )}
      </header>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>Carrinho vazio</h2>
          <p className={styles.emptyText}>
            Adicione itens do cardápio para fazer seu pedido.
          </p>
          <button
            className={styles.emptyButton}
            onClick={handleBackToMenu}
            type="button"
          >
            Voltar ao cardápio
          </button>
        </div>
      ) : (
        <main className={styles.main}>
          <div className={styles.itemsList}>
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            ))}
          </div>

          <div className={styles.summaryContainer}>
            <CartSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              itemCount={itemCount}
              onCheckout={handleCheckout}
            />
          </div>
        </main>
      )}
    </div>
  );
}
