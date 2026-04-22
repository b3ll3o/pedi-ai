'use client';

import type { products } from '@/lib/supabase/types';
import { useCartStore } from '@/stores/cartStore';
import styles from './ProductList.module.css';

export type Product = products;

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  onProductClick?: (productId: string) => void;
  selectedCategoryId?: string | null;
}

export function ProductList({
  products,
  isLoading = false,
  onProductClick,
  selectedCategoryId,
}: ProductListProps) {
  const addItem = useCartStore((state) => state.addItem);
  if (isLoading) {
    return (
      <div className={styles.grid} data-testid="product-list">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`skeleton-${index}`} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  const filteredProducts = selectedCategoryId
    ? products.filter((product) => product.category_id === selectedCategoryId)
    : products;

  if (filteredProducts.length === 0) {
    return (
      <div className={styles.empty} data-testid="product-list">
        <p>Nenhum produto disponível nesta categoria</p>
      </div>
    );
  }

  return (
    <div className={styles.grid} data-testid="product-list">
      {filteredProducts.map((product, index) => (
        <div
          key={product.id}
          className={styles.item}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div
            className={styles.productCard}
            onClick={() => onProductClick?.(product.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onProductClick?.(product.id);
              }
            }}
            data-testid="product-card"
          >
            <div className={styles.productInfo}>
              <h3 className={styles.productName}>{product.name}</h3>
              {product.description && (
                <p className={styles.productDescription}>{product.description}</p>
              )}
              <span className={styles.productPrice} data-testid="product-price">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
              <button
                className={styles.addToCartButton}
                onClick={(e) => {
                  e.stopPropagation();
                  addItem({
                    productId: product.id,
                    name: product.name,
                    quantity: 1,
                    unitPrice: product.price,
                    modifiers: [],
                  });
                }}
                data-testid="add-to-cart-button"
                aria-label={`Adicionar ${product.name} ao carrinho`}
              >
                +
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}