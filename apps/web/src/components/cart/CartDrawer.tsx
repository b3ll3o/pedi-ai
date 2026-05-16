'use client';

import { useEffect } from 'react';
import { useCartStore, getTotalItems, getTotalPrice } from '@/infrastructure/persistence/cartStore';
import { CartSummary } from './CartSummary';
import styles from './CartDrawer.module.css';

const SERVICE_TAX_RATE = 0.1;

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const items = useCartStore((state) => state.items);
  const closeCart = useCartStore((state) => state.closeCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  const totalItems = getTotalItems(useCartStore.getState());
  const subtotal = getTotalPrice(useCartStore.getState());
  const tax = subtotal * SERVICE_TAX_RATE;
  const total = subtotal + tax;

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeCart]);

  const handleCheckout = () => {
    // Checkout navigation handled by CartSummary component
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onClick={closeCart}
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho de compras"
    >
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Seu Pedido</h2>
            <span className={styles.itemCount}>
              {totalItems} ite{totalItems !== 1 ? 'ns' : 'm'}
            </span>
          </div>
          <button
            className={styles.closeButton}
            onClick={closeCart}
            aria-label="Fechar carrinho"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className={styles.content}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <svg
                className={styles.emptyIcon}
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
              <p className={styles.emptyText}>Seu carrinho está vazio</p>
              <p className={styles.emptySubtext}>
                Adicione itens do cardápio para fazer seu pedido
              </p>
            </div>
          ) : (
            <ul className={styles.itemList}>
              {items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemName}>{item.name}</span>
                    <button
                      className={styles.removeButton}
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remover ${item.name}`}
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
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {item.modifiers.length > 0 && (
                    <div className={styles.modifiers}>
                      {item.modifiers.map((mod, idx) => (
                        <span key={idx} className={styles.modifier}>
                          {mod.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && <p className={styles.notes}>{item.notes}</p>}

                  <div className={styles.itemFooter}>
                    <div className={styles.quantityControls}>
                      <button
                        className={styles.quantityButton}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Diminuir quantidade"
                        type="button"
                      >
                        −
                      </button>
                      <span className={styles.quantity}>{item.quantity}</span>
                      <button
                        className={styles.quantityButton}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Aumentar quantidade"
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    <span className={styles.itemPrice}>
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className={styles.footer}>
            <CartSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              itemCount={totalItems}
              onCheckout={handleCheckout}
            />
            <button
              className={styles.clearButton}
              onClick={clearCart}
              type="button"
              data-testid="clear-cart-button"
            >
              Limpar carrinho
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
