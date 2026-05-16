'use client';

import Image from 'next/image';
import type { products } from '@/lib/supabase/types';
import { useCartStore } from '@/infrastructure/persistence/cartStore';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: products;
  onClick?: (productId: string) => void;
}

// Map dietary labels to colors
const DIETARY_LABELS: Record<string, { color: string; bg: string; label: string }> = {
  vegan: { color: 'var(--color-success)', bg: 'var(--color-success-light)', label: 'Vegano' },
  vegetarian: {
    color: 'var(--color-success)',
    bg: 'var(--color-success-light)',
    label: 'Vegetariano',
  },
  'gluten-free': {
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-light)',
    label: 'Sem Glúten',
  },
  'lactose-free': {
    color: 'var(--color-secondary)',
    bg: 'var(--color-secondary-light)',
    label: 'Sem Lactose',
  },
  'egg-free': { color: 'var(--color-warning)', bg: 'var(--color-warning-light)', label: 'Sem Ovo' },
  'dairy-free': {
    color: 'var(--color-secondary)',
    bg: 'var(--color-secondary-light)',
    label: 'Sem Laticínios',
  },
  'sugar-free': {
    color: 'var(--color-secondary)',
    bg: 'var(--color-secondary-light)',
    label: 'Sem Açúcar',
  },
  organic: { color: 'var(--color-success)', bg: 'var(--color-success-light)', label: 'Orgânico' },
  spicy: { color: 'var(--color-error)', bg: 'var(--color-error-light)', label: 'Picante' },
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

function getGradientPlaceholder(name: string): string {
  const gradients = [
    'var(--gradient-primary)',
    'var(--gradient-warm)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  ];
  const index =
    name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleClick = () => {
    onClick?.(product.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(product.id);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.available) return;
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: 1,
      modifiers: [],
    });
  };

  const hasImage = Boolean(product.image_url);
  const gradientBg = getGradientPlaceholder(product.name);

  return (
    <div className={styles.wrapper} data-testid="product-card">
      <button
        className={`${styles.card} ${!product.available ? styles.unavailable : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Ver produto ${product.name}`}
        aria-disabled={!product.available}
        type="button"
      >
        <div className={styles.imageContainer}>
          {hasImage ? (
            <Image
              src={product.image_url!}
              alt={product.name}
              fill
              className={styles.image}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div
              className={styles.placeholder}
              style={{ background: gradientBg }}
              aria-hidden="true"
            >
              <span className={styles.placeholderInitial}>
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {!product.available && (
            <div className={styles.unavailableOverlay}>
              <span className={styles.unavailableBadge}>Esgotado</span>
            </div>
          )}
        </div>

        <div className={styles.content}>
          <h3 className={styles.name}>{product.name}</h3>

          {product.description && <p className={styles.description}>{product.description}</p>}

          <div className={styles.footer}>
            <span className={styles.price} data-testid="product-price">
              {formatPrice(product.price)}
            </span>

            {product.dietary_labels && product.dietary_labels.length > 0 && (
              <div className={styles.badges}>
                {product.dietary_labels.slice(0, 3).map((label) => {
                  const labelInfo = DIETARY_LABELS[label.toLowerCase()];
                  return (
                    <span
                      key={label}
                      className={styles.badge}
                      style={
                        labelInfo
                          ? { color: labelInfo.color, backgroundColor: labelInfo.bg }
                          : undefined
                      }
                      title={labelInfo?.label ?? label}
                    >
                      {labelInfo?.label ?? label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </button>
      <button
        className={styles.addButton}
        onClick={handleAddToCart}
        disabled={!product.available}
        data-testid="add-to-cart-button"
        type="button"
        aria-label={`Adicionar ${product.name} ao carrinho`}
      >
        Adicionar
      </button>
    </div>
  );
}
