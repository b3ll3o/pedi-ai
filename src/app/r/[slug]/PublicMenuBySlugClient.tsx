'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRestaurante } from '@/hooks/useRestaurante';
import { useCardapio } from '@/hooks/useCardapio';
import { useCartStore } from '@/stores/cartStore';
import { useMenuStore } from '@/stores/menuStore';
import { SearchBar } from '@/components/menu/SearchBar';
import { CategoryList } from '@/components/menu/CategoryList';
import { ProductList } from '@/components/menu/ProductList';
import { CartBadge } from '@/components/cart/CartBadge';
import type { Category } from '@/components/menu/CategoryList';
import type { MenuResponse } from '@/hooks/useCardapio';
import styles from './page.module.css';

interface PublicMenuBySlugClientProps {
  slug: string;
  mesaId?: string;
}

function transformCategories(categoriesFromHook: MenuResponse['categories']): Category[] {
  return categoriesFromHook.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    imageUrl: c.image_url ?? undefined,
  }));
}

function PublicMenuContent({ restaurantId, restaurantName, mesaId }: { restaurantId: string; restaurantName: string; mesaId?: string }) {
  const { data, isLoading, error } = useCardapio(restaurantId);
  const searchQuery = useMenuStore((state) => state.searchQuery);
  const setCartRestaurantId = useCartStore((state) => state.setRestaurantId);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setCartRestaurantId(restaurantId);
      return;
    }
    setCartRestaurantId(restaurantId);
  }, [restaurantId, setCartRestaurantId]);

  const transformedCategories = useMemo(() => {
    const categories = data?.categories;
    if (!categories) return [];
    return transformCategories(categories);
  }, [data]);

  const allProducts = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.flatMap((cat) => cat.products);
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (searchQuery.trim() === '') return [];
    const query = searchQuery.toLowerCase().trim();
    return allProducts.filter((p) => p.name.toLowerCase().includes(query));
  }, [allProducts, searchQuery]);

  const isSearching = searchQuery.trim() !== '';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title} data-testid="page-title">{restaurantName}</h1>
        <CartBadge />
      </header>

      <div className={styles.searchContainer}>
        <SearchBar />
      </div>

      <main className={styles.main}>
        {error && (
          <div className={styles.error} role="alert">
            <p>Erro ao carregar cardápio: {error.message}</p>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>
            <p>Carregando cardápio...</p>
          </div>
        ) : isSearching ? (
          <>
            <div className={styles.searchResultsHeader}>
              <h2 className={styles.sectionTitle}>
                Resultados para &quot;{searchQuery}&quot;
              </h2>
              <span className={styles.resultCount}>
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            {filteredProducts.length > 0 ? (
              <ProductList
                products={filteredProducts}
                isLoading={false}
                onProductClick={(id) => window.location.href = `/product/${id}?restaurant=${restaurantId}&mesaId=${mesaId || ''}`}
              />
            ) : (
              <div className={styles.noResults}>
                <p>Nenhum produto encontrado.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>Categorias</h2>
            <CategoryList
              categories={transformedCategories}
              isLoading={isLoading}
              onCategoryClick={(id) => window.location.href = `/menu/${id}?restaurant=${restaurantId}&mesaId=${mesaId || ''}`}
            />
          </>
        )}
      </main>

      {mesaId && (
        <div className={styles.mesaIndicator}>
          Mesa: {mesaId}
        </div>
      )}
    </div>
  );
}

export function PublicMenuBySlugClient({ slug, mesaId }: PublicMenuBySlugClientProps) {
  const { restaurante, isLoading, error } = useRestaurante(slug);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Carregando restaurante...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurante) {
    return (
      <div className={styles.container}>
        <div className={styles.error} role="alert">
          <h1>Restaurante não encontrado</h1>
          <p>O cardápio digital não está disponível para este restaurante.</p>
        </div>
      </div>
    );
  }

  return (
    <PublicMenuContent
      restaurantId={restaurante.id}
      restaurantName={restaurante.name}
      mesaId={mesaId}
    />
  );
}
