'use client';

import { useEffect, useId, useRef } from 'react';

import { useCartStore, getTotalItems, getTotalPrice } from '@/infrastructure/persistence/cartStore';

import styles from './CartDrawer.module.css';
import { CartSummary } from './CartSummary';

const SERVICE_TAX_RATE = 0.1;

/** Seletores de elementos focáveis dentro do drawer. */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

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

  const titleId = useId();

  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const totalItems = getTotalItems(useCartStore.getState());
  const subtotal = getTotalPrice(useCartStore.getState());
  const tax = subtotal * SERVICE_TAX_RATE;
  const total = subtotal + tax;

  // Impede scroll do body quando o drawer está aberto. Restaura o valor
  // original no cleanup para não interferir com outros componentes.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Fecha com ESC e gerencia focus trap (WCAG 2.4.3 + 2.1.2).
  //
  // Por que manual em vez de `<dialog>` nativo? `<dialog>` no React 19
  // funciona, mas o componente já existia com `<div role="dialog">` —
  // migrar agora expande o diff sem mudar comportamento observável. O
  // trap manual aqui cobre o requisito e fica isolado.
  useEffect(() => {
    if (!isOpen) return;

    // 1. Salva o elemento focado antes de abrir para devolver o foco
    //    ao fechar (não deixar o foco "preso" no body).
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // 2. Move foco inicial para o botão Fechar (sempre presente).
    const drawer = drawerRef.current;
    const closeButton = drawer?.querySelector<HTMLButtonElement>('button[data-drawer-close]');
    closeButton?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeCart();
        return;
      }
      if (e.key !== 'Tab' || !drawer) return;

      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Shift+Tab no primeiro → vai para o último (wrap).
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      // Tab no último → vai para o primeiro (wrap).
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
        return;
      }
      // Foco escapou do drawer (clique no overlay, devtools, etc.) →
      // devolve ao primeiro elemento focável.
      if (active && !drawer.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Devolve foco ao trigger original (ex.: botão do header que abriu o drawer).
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
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
      aria-labelledby={titleId}
    >
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()} ref={drawerRef}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h2 id={titleId} className={styles.title}>
              Seu Pedido
            </h2>
            <span className={styles.itemCount}>
              {totalItems} ite{totalItems !== 1 ? 'ns' : 'm'}
            </span>
          </div>
          <button
            className={styles.closeButton}
            onClick={closeCart}
            aria-label="Fechar carrinho"
            type="button"
            data-drawer-close
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
