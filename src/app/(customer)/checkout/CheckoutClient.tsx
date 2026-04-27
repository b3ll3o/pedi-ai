'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { CheckoutForm } from './CheckoutForm';
import styles from './page.module.css';

export default function CheckoutClient() {
  const router = useRouter();
  const { signOut } = useAuth();
  const items = useCartStore((state) => state.items);
  const validateCart = useCartStore((state) => state.validateCart);

  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        const result = await validateCart('default-restaurant');
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
  }, [items.length, validateCart, router]);

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
        <CheckoutForm />
      </main>
    </div>
  );
}
