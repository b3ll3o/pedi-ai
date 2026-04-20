'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import type { products, modifier_groups, modifier_values } from '@/lib/supabase/types';
import { ModifierSelector } from './ModifierSelector';
import type { CartItem, SelectedModifier } from './types';
import styles from './ProductDetail.module.css';

// ── Types ────────────────────────────────────────────────────

interface ProductDetailProps {
  productId: string;
  restaurantId: string;
  onAddToCart: (item: CartItem) => void;
}

type ModifierGroupFromDB = Omit<modifier_groups, 'created_at'> & {
  modifier_values: Omit<modifier_values, 'modifier_group_id' | 'created_at'>[];
};

type ProductWithModifiers = products & {
  modifier_groups?: ModifierGroupFromDB[];
};

interface ProductResponse {
  product: ProductWithModifiers;
}

// ── Constants ────────────────────────────────────────────────────

const DIETARY_LABELS: Record<string, { color: string; bg: string; label: string }> = {
  vegan: { color: '#16a34a', bg: '#dcfce7', label: 'Vegano' },
  vegetarian: { color: '#16a34a', bg: '#dcfce7', label: 'Vegetariano' },
  'gluten-free': { color: '#d97706', bg: '#fef3c7', label: 'Sem Glúten' },
  'lactose-free': { color: '#3b82f6', bg: '#dbeafe', label: 'Sem Lactose' },
  'egg-free': { color: '#d97706', bg: '#fef3c7', label: 'Sem Ovo' },
  'dairy-free': { color: '#3b82f6', bg: '#dbeafe', label: 'Sem Laticínios' },
  'sugar-free': { color: '#8b5cf6', bg: '#ede9fe', label: 'Sem Açúcar' },
  organic: { color: '#16a34a', bg: '#dcfce7', label: 'Orgânico' },
  spicy: { color: '#dc2626', bg: '#fee2e2', label: 'Picante' },
};

// ── Helpers ────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────

export function ProductDetail({ productId, restaurantId, onAddToCart }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);

  const { data, isLoading, error } = useQuery<ProductResponse>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await fetch(
        `/api/menu/products/${encodeURIComponent(productId)}?restaurant_id=${encodeURIComponent(restaurantId)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Produto não encontrado');
        }
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message ?? `Failed to fetch product: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const product = data?.product;

  const handleModifierChange = (groupId: string, values: SelectedModifier[]) => {
    setSelectedModifiers((prev) => [
      ...prev.filter((m) => m.group_id !== groupId),
      ...values,
    ]);
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
    return (product.price + modifierTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (!product) return;

    const cartItem: CartItem = {
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      quantity,
      unit_price: product.price,
      modifiers: selectedModifiers,
      total_price: calculateTotalPrice(),
    };

    onAddToCart(cartItem);

    // Reset after adding
    setQuantity(1);
    setSelectedModifiers([]);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonDescription} />
            <div className={styles.skeletonDescription} />
            <div className={styles.skeletonPrice} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2 className={styles.errorTitle}>Produto não encontrado</h2>
          <p className={styles.errorMessage}>
            Este produto pode ter sido removido ou estar indisponível.
          </p>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => window.history.back()}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const hasImage = Boolean(product.image_url);
  const gradientBg = getGradientPlaceholder(product.name);

  return (
    <div className={styles.container}>
      <div className={styles.imageSection}>
        {hasImage ? (
          <Image
            src={product.image_url!}
            alt={product.name}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
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
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.name}>{product.name}</h1>
          <span className={styles.price}>{formatPrice(product.price)}</span>
        </div>

        {product.description && (
          <p className={styles.description}>{product.description}</p>
        )}

        {product.dietary_labels && product.dietary_labels.length > 0 && (
          <div className={styles.badges}>
            {product.dietary_labels.map((label) => {
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

        {product.modifier_groups && product.modifier_groups.length > 0 && (
          <div className={styles.modifiersSection}>
            <h3 className={styles.modifiersTitle}>Personalize seu pedido</h3>
            {product.modifier_groups.map((group) => (
              <ModifierSelector
                key={group.id}
                modifierGroup={group as any}
                selectedValues={selectedModifiers.filter(
                  (m) => m.group_id === group.id
                )}
                onChange={(values) => handleModifierChange(group.id, values)}
              />
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.quantitySection}>
            <span className={styles.quantityLabel}>Quantidade</span>
            <div className={styles.quantityControls}>
              <button
                type="button"
                className={styles.quantityButton}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
              >
                −
              </button>
              <span className={styles.quantityValue}>{quantity}</span>
              <button
                type="button"
                className={styles.quantityButton}
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.addToCartButton}
            onClick={handleAddToCart}
          >
            Adicionar ao carrinho — {formatPrice(calculateTotalPrice())}
          </button>
        </div>
      </div>
    </div>
  );
}
