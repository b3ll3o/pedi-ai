'use client';

import { useState } from 'react';
import type { CartItem } from '@/infrastructure/persistence/cartStore';
import styles from './CheckoutForm.module.css';

export interface CheckoutFormProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  onSubmit: (data: CheckoutData) => Promise<void> | void;
}

export interface CheckoutData {
  customerName: string;
  customerPhone: string;
}

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CheckoutForm({ items, subtotal, tax, total, onSubmit }: CheckoutFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; offline?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {};

    if (!customerName.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!customerPhone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (customerPhone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, offline: undefined }));
    try {
      await onSubmit({ customerName, customerPhone });
    } catch (error) {
      if (
        navigator.onLine === false ||
        (error instanceof Error && error.message.includes('offline'))
      ) {
        setErrors((prev) => ({
          ...prev,
          offline: 'Você está offline. O pedido será enviado quando a conexão for restaurada.',
        }));
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setCustomerPhone(value);
    }
  };

  const formatPhoneDisplay = (value: string): string => {
    if (value.length <= 10) {
      return value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="checkout-form">
      <div className={styles.section} data-testid="order-summary">
        <h2 className={styles.sectionTitle}>Resumo do Pedido</h2>
        <div className={styles.orderItems}>
          {items.map((item) => (
            <div key={item.id} className={styles.orderItem}>
              <div className={styles.orderItemInfo}>
                <span className={styles.orderItemQuantity}>{item.quantity}x</span>
                <span className={styles.orderItemName}>{item.name}</span>
              </div>
              <span className={styles.orderItemPrice}>
                {formatPrice(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.orderTotals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Taxa de serviço</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.totalRowFinal}>
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Dados do Cliente</h2>
        <div className={styles.field}>
          <label htmlFor="customerName" className={styles.label}>
            Nome
          </label>
          <input
            id="customerName"
            type="text"
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Seu nome"
            disabled={isSubmitting}
            data-testid="checkout-name"
          />
          {errors.name && (
            <span className={styles.error} data-testid="field-error">
              {errors.name}
            </span>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="customerPhone" className={styles.label}>
            Telefone
          </label>
          <input
            id="customerPhone"
            type="tel"
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            value={formatPhoneDisplay(customerPhone)}
            onChange={handlePhoneChange}
            placeholder="(00) 00000-0000"
            disabled={isSubmitting}
            data-testid="checkout-phone"
          />
          {errors.phone && (
            <span className={styles.error} data-testid="field-error">
              {errors.phone}
            </span>
          )}
        </div>
      </div>

      {errors.offline && (
        <div className={styles.offlineError} data-testid="offline-error">
          {errors.offline}
        </div>
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting || items.length === 0}
        data-testid="checkout-submit submit-order-button"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar Pedido'}
      </button>
    </form>
  );
}
