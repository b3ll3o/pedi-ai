'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import styles from './page.module.css';

const TAX_RATE = 0.1;

export default function CheckoutClient() {
  const router = useRouter();
  const { signOut } = useAuth();
  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const validateCart = useCartStore((state) => state.validateCart);
  const clearCart = useCartStore((state) => state.clearCart);

  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleSubmit = async (data: { customerName: string; customerPhone: string; paymentMethod: 'pix' }) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: data.customerPhone,
        customer_phone: data.customerPhone,
        customer_name: data.customerName,
        restaurant_id: restaurantId || undefined,
        table_id: null,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          modifiers: item.modifiers.map((m) => ({ name: m.name, price: m.price_adjustment })),
        })),
        payment_method: data.paymentMethod,
        idempotency_key: crypto.randomUUID(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar pedido');
    }

    const order = await response.json();
    clearCart();
    router.push(`/order/${order.id}`);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const validate = async () => {
      if (items.length === 0) {
        router.replace('/cart');
        return;
      }

      try {
        const result = await validateCart(restaurantId || 'default-restaurant');
        if (!result.valid) {
          setValidationError(result.errors.join(', '));
        }
      } catch {
        setValidationError('Erro ao validar carrinho');
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [items.length, validateCart, router, restaurantId]);

  if (isValidating) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Validando carrinho...</div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>Não foi possível continuar</h2>
          <p className={styles.errorMessage}>{validationError}</p>
          <button
            className={styles.backButton}
            onClick={() => router.push('/cart')}
            type="button"
          >
            Voltar ao carrinho
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/cart')}
          aria-label="Voltar ao carrinho"
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
        <h1 className={styles.title}>Finalizar Pedido</h1>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={styles.logoutButton}
          aria-label="Sair da conta"
          data-testid="customer-logout-button"
        >
          {isLoggingOut ? (
            <span className={styles.logoutSpinner} aria-hidden="true" />
          ) : (
            <LogOut size={18} aria-hidden="true" />
          )}
          {isLoggingOut && <span className={styles.logoutText}>Saindo...</span>}
        </button>
      </header>

      <main className={styles.main}>
        <CheckoutForm
          items={items}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
}
