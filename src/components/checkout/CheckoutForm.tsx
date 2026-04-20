'use client';

import { useState } from 'react';
import type { CartItem } from '@/stores/cartStore';
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
  paymentMethod: 'pix' | 'credit' | 'debit';
}

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CheckoutForm({
  items,
  subtotal,
  tax,
  total,
  onSubmit,
}: CheckoutFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit'>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

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
    try {
      await onSubmit({ customerName, customerPhone, paymentMethod });
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
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Resumo do Pedido</h2>
        <div className={styles.orderItems}>
          {items.map((item) => (
            <div key={item.id} className={styles.orderItem}>
              <div className={styles.orderItemInfo}>
                <span className={styles.orderItemQuantity}>{item.quantity}x</span>
                <span className={styles.orderItemName}>{item.name}</span>
              </div>
              <span className={styles.orderItemPrice}>{formatPrice(item.unitPrice * item.quantity)}</span>
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
          <label htmlFor="customerName" className={styles.label}>Nome</label>
          <input
            id="customerName"
            type="text"
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Seu nome"
            disabled={isSubmitting}
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor="customerPhone" className={styles.label}>Telefone</label>
          <input
            id="customerPhone"
            type="tel"
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            value={formatPhoneDisplay(customerPhone)}
            onChange={handlePhoneChange}
            placeholder="(00) 00000-0000"
            disabled={isSubmitting}
          />
          {errors.phone && <span className={styles.error}>{errors.phone}</span>}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Forma de Pagamento</h2>
        <div className={styles.paymentMethods}>
          <label className={`${styles.paymentOption} ${paymentMethod === 'pix' ? styles.paymentOptionSelected : ''}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="pix"
              checked={paymentMethod === 'pix'}
              onChange={() => setPaymentMethod('pix')}
              disabled={isSubmitting}
              className={styles.radioInput}
            />
            <div className={styles.paymentIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
              </svg>
            </div>
            <span className={styles.paymentName}>PIX</span>
          </label>
          <label className={`${styles.paymentOption} ${paymentMethod === 'credit' ? styles.paymentOptionSelected : ''}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="credit"
              checked={paymentMethod === 'credit'}
              onChange={() => setPaymentMethod('credit')}
              disabled={isSubmitting}
              className={styles.radioInput}
            />
            <div className={styles.paymentIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <span className={styles.paymentName}>Crédito</span>
          </label>
          <label className={`${styles.paymentOption} ${paymentMethod === 'debit' ? styles.paymentOptionSelected : ''}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="debit"
              checked={paymentMethod === 'debit'}
              onChange={() => setPaymentMethod('debit')}
              disabled={isSubmitting}
              className={styles.radioInput}
            />
            <div className={styles.paymentIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="6" y1="14" x2="10" y2="14" />
              </svg>
            </div>
            <span className={styles.paymentName}>Débito</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting || items.length === 0}
      >
        {isSubmitting ? 'Processando...' : 'Finalizar Pagamento'}
      </button>
    </form>
  );
}