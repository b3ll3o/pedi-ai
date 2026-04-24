'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProductDetail } from '@/components/menu/ProductDetail';
import { useCartStore, getTotalItems, type CartItem as StoreCartItem } from '@/stores/cartStore';
import type { CartItem } from '@/components/menu/types';
import styles from './page.module.css';

// ── Toast Component ────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert">
      <span>{message}</span>
      <button
        type="button"
        className={styles.toastClose}
        onClick={onClose}
        aria-label="Fechar"
      >
        ×
      </button>
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────

interface ProductDetailClientProps {
  productId: string;
}

export default function ProductDetailClient({ productId }: ProductDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCartOptions, setShowCartOptions] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const [cartCount, setCartCount] = useState(() => getTotalItems(useCartStore.getState()));

  const handleAddToCart = useCallback((item: CartItem) => {
    setPendingCartItem(item);
    setShowCartOptions(true);
  }, []);

  const confirmAddToCart = useCallback(() => {
    if (pendingCartItem) {
      // Convert from menu CartItem (snake_case) to store CartItem (camelCase)
      const storeCartItem: StoreCartItem = {
        id: crypto.randomUUID(),
        productId: pendingCartItem.product_id,
        name: pendingCartItem.name,
        quantity: pendingCartItem.quantity,
        unitPrice: pendingCartItem.unit_price,
        modifiers: pendingCartItem.modifiers,
        createdAt: new Date(),
      };
      addItem(storeCartItem);
      setCartCount(getTotalItems(useCartStore.getState()));
      setToast({ message: 'Produto adicionado ao carrinho', type: 'success' });
    }
    setShowCartOptions(false);
    setPendingCartItem(null);
  }, [pendingCartItem, addItem]);

  const confirmAddAndGoToCart = useCallback(() => {
    if (pendingCartItem) {
      // Convert from menu CartItem (snake_case) to store CartItem (camelCase)
      const storeCartItem: StoreCartItem = {
        id: crypto.randomUUID(),
        productId: pendingCartItem.product_id,
        name: pendingCartItem.name,
        quantity: pendingCartItem.quantity,
        unitPrice: pendingCartItem.unit_price,
        modifiers: pendingCartItem.modifiers,
        createdAt: new Date(),
      };
      addItem(storeCartItem);
      setCartCount(getTotalItems(useCartStore.getState()));
      setToast({ message: 'Produto adicionado ao carrinho', type: 'success' });
    }
    setShowCartOptions(false);
    setPendingCartItem(null);
    router.push('/cart');
  }, [pendingCartItem, addItem, router]);

  const cancelAddToCart = useCallback(() => {
    setShowCartOptions(false);
    setPendingCartItem(null);
  }, []);

  // Get restaurantId from searchParams (required by ProductDetail/API)
  const restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Restaurant ID não encontrado</h2>
          <p>O restaurant_id é obrigatório para visualizar o produto.</p>
          <Link href="/" className={styles.backButton}>
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.back()}
          aria-label="Voltar"
        >
          ←
        </button>
        <h1 className={styles.title}>Detalhes do Produto</h1>
        <Link href="/cart" className={styles.cartButton} aria-label="Ver carrinho">
          🛒
          {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
        </Link>
      </header>

      {/* Product Detail */}
      <main className={styles.main}>
        <ProductDetail
          productId={productId}
          restaurantId={restaurantId}
          onAddToCart={handleAddToCart}
        />
      </main>

      {/* Cart Options Modal */}
      {showCartOptions && (
        <div className={styles.modalOverlay} onClick={cancelAddToCart}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Produto adicionado!</h3>
            <p className={styles.modalMessage}>
              O que você gostaria de fazer agora?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButtonSecondary}
                onClick={confirmAddToCart}
              >
                Continuar comprando
              </button>
              <button
                type="button"
                className={styles.modalButtonPrimary}
                onClick={confirmAddAndGoToCart}
              >
                Ir para o carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
