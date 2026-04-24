'use client';

import Image from 'next/image';
import type { CartItem as CartItemType } from '@/stores/cartStore';
import styles from './CartItem.module.css';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

function getGradientPlaceholder(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleIncrement = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    } else {
      onRemove(item.id);
    }
  };

  const handleRemove = () => {
    onRemove(item.id);
  };

  const hasImage = Boolean(item.productId); // Placeholder for actual image - would need image_url in CartItem

  return (
    <div className={styles.item} data-testid="cart-item">
      <div className={styles.imageContainer}>
        {hasImage ? (
          <Image
            src={`https://picsum.photos/seed/${item.productId}/80/80`}
            alt={item.name}
            fill
            className={styles.image}
            sizes="80px"
          />
        ) : (
          <div
            className={styles.placeholder}
            style={{ background: getGradientPlaceholder(item.name) }}
            aria-hidden="true"
          >
            <span className={styles.placeholderInitial}>
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{item.name}</h3>
          <button
            className={styles.removeButton}
            onClick={handleRemove}
            aria-label={`Remover ${item.name} do carrinho`}
            type="button"
            data-testid="cart-item-remove"
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
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>

        {item.modifiers.length > 0 && (
          <ul className={styles.modifiers}>
            {item.modifiers.map((mod) => (
              <li key={mod.modifier_id} className={styles.modifier}>
                <span className={styles.modifierName}>
                  {mod.group_name}: {mod.name}
                </span>
                {mod.price_adjustment !== 0 && (
                  <span className={styles.modifierPrice}>
                    {mod.price_adjustment > 0 ? '+' : ''}{formatPrice(mod.price_adjustment)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {item.notes && (
          <p className={styles.notes}>Obs: {item.notes}</p>
        )}

        <div className={styles.footer}>
          <div className={styles.unitPrice}>
            <span className={styles.unitPriceLabel}>Unitário:</span>
            <span className={styles.unitPriceValue}>{formatPrice(item.unitPrice)}</span>
          </div>

          <div className={styles.quantityControls}>
            <button
              className={styles.quantityButton}
              onClick={handleDecrement}
              aria-label="Diminuir quantidade"
              type="button"
              data-testid="cart-item-decrease"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <span className={styles.quantity} data-testid="quantity-input">{item.quantity}</span>
            <button
              className={styles.quantityButton}
              onClick={handleIncrement}
              aria-label="Aumentar quantidade"
              type="button"
              data-testid="cart-item-increase"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className={styles.totalPrice} data-testid="cart-item-price">
            {formatPrice(item.unitPrice * item.quantity)}
          </div>
        </div>
      </div>
    </div>
  );
}