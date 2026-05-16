'use client';

import { useState, useMemo } from 'react';
import { products } from '@/lib/supabase/types';
import styles from './ProductList.module.css';

interface ProductListProps {
  products: products[];
  onEdit: (product: products) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (product: products) => void;
}

export function ProductList({
  products,
  onEdit,
  onDelete,
  onToggleAvailability,
}: ProductListProps) {
  const [search, setSearch] = useState('');
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'available' | 'unavailable'>(
    'all'
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesFilter =
        filterAvailable === 'all' ||
        (filterAvailable === 'available' && p.available) ||
        (filterAvailable === 'unavailable' && !p.available);
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filterAvailable]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🍽️</span>
        <p>Nenhum produto encontrado</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Buscar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar produtos"
        />
        <select
          className={styles.filter}
          value={filterAvailable}
          onChange={(e) => setFilterAvailable(e.target.value as typeof filterAvailable)}
          aria-label="Filtrar por disponibilidade"
        >
          <option value="all">Todos</option>
          <option value="available">Disponíveis</option>
          <option value="unavailable">Indisponíveis</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.noResults}>
          <p>Nenhum produto corresponde aos filtros</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((product) => (
            <div key={product.id} className={styles.item} data-testid="product-item">
              <div className={styles.info}>
                <span className={styles.name}>{product.name}</span>
                {product.description && (
                  <span className={styles.description}>{product.description}</span>
                )}
                <span className={styles.price}>{formatPrice(product.price)}</span>
                {product.dietary_labels && product.dietary_labels.length > 0 && (
                  <div className={styles.labels}>
                    {product.dietary_labels.map((label) => (
                      <span key={label} className={styles.label}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span
                className={`${styles.badge} ${product.available ? styles.available : styles.unavailable}`}
              >
                {product.available ? 'Disponível' : 'Indisponível'}
              </span>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={() => onToggleAvailability(product)}
                  title={product.available ? 'Marcar como indisponível' : 'Marcar como disponível'}
                  data-testid="toggle-availability"
                >
                  {product.available ? '⏸️' : '▶️'}
                </button>
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={() => onEdit(product)}
                  title="Editar"
                  data-testid="edit-button"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className={`${styles.btnIcon} ${styles.btnDelete}`}
                  onClick={() => onDelete(product.id)}
                  title="Excluir"
                  data-testid="delete-button"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.summary}>
        Mostrando {filtered.length} de {products.length} produtos
      </div>
    </div>
  );
}
