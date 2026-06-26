'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';

import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CategoryList } from '@/components/menu/CategoryList';
import type { Category } from '@/components/menu/CategoryList';
import { ProductList } from '@/components/menu/ProductList';
import { SearchBar } from '@/components/menu/SearchBar';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { useCardapio } from '@/hooks/useCardapio';
import type { MenuResponse } from '@/hooks/useCardapio';
import { useCartStore } from '@/infrastructure/persistence/cartStore';
import { useMenuStore } from '@/infrastructure/persistence/menuStore';

import styles from './page.module.css';

interface MenuPageClientProps {
  restaurantId: string;
}

// Transform domain categories to Category type expected by CategoryList
function transformCategories(categoriesFromHook: MenuResponse['categories']): Category[] {
  return categoriesFromHook.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    imageUrl: c.image_url ?? undefined,
  }));
}

// Converte DTOs de cardápio (transporte HTTP) em entidades de domínio
// (Categoria/ItemCardapio) para alimentar o store Zustand, que mantém
// invariantes do domínio.
function categoriasDtoParaEntidade(dto: MenuResponse['categories']): Categoria[] {
  const now = new Date();
  return dto.map((c) =>
    Categoria.reconstruir({
      id: c.id,
      restauranteId: c.restaurant_id,
      nome: c.name,
      descricao: c.description,
      imagemUrl: c.image_url,
      ordemExibicao: c.sort_order,
      ativo: c.active,
      criadoEm: now,
      atualizadoEm: now,
      deletedAt: null,
      version: 1,
    })
  );
}

function produtosDtoParaEntidade(categorias: MenuResponse['categories']): ItemCardapio[] {
  const now = new Date();
  return categorias.flatMap((c) =>
    c.products.map((p) =>
      ItemCardapio.reconstruir({
        id: p.id,
        categoriaId: p.category_id,
        restauranteId: c.restaurant_id,
        nome: p.name,
        descricao: p.description,
        imagemUrl: p.image_url,
        preco: Dinheiro.criar(p.price),
        // Cast justificado: DTO carrega strings livres; o domínio narrow em
        // tempo de uso via `temLabel`. Aceitamos o ruído por ora.
        labelsDieteticos: p.dietary_labels as unknown as Parameters<
          typeof ItemCardapio.reconstruir
        >[0]['labelsDieteticos'],
        tipo: TipoItemCardapio.fromValue('produto'),
        ativo: p.available,
        criadoEm: now,
        atualizadoEm: now,
        deletedAt: null,
        version: 1,
      })
    )
  );
}

export default function MenuPageClient({ restaurantId }: MenuPageClientProps) {
  const { data, isLoading, error } = useCardapio(restaurantId);

  const currentRestaurantId = useMenuStore((state) => state.restaurantId);
  const setRestaurantId = useMenuStore((state) => state.setRestaurantId);
  const products = useMenuStore((state) => state.products);
  const searchQuery = useMenuStore((state) => state.searchQuery);
  const setCategories = useMenuStore((state) => state.setCategories);
  const setProducts = useMenuStore((state) => state.setProducts);
  const _setSearchQuery = useMenuStore((state) => state.setSearchQuery);

  const setCartRestaurantId = useCartStore((state) => state.setRestaurantId);
  const clearCart = useCartStore((state) => state.clearCart);

  const isFirstRender = useRef(true);

  // Set restaurantId and handle cart isolation
  useEffect(() => {
    // On first render, just set the restaurantId
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setRestaurantId(restaurantId);
      setCartRestaurantId(restaurantId);
      return;
    }

    // If restaurant changed, clear cart
    if (currentRestaurantId && currentRestaurantId !== restaurantId) {
      clearCart();
    }

    setRestaurantId(restaurantId);
    setCartRestaurantId(restaurantId);
  }, [restaurantId, currentRestaurantId, setRestaurantId, setCartRestaurantId, clearCart]);

  // Transform categories to expected type
  const transformedCategories = useMemo(() => {
    const categories = data?.categories;
    if (!categories) return [];
    return transformCategories(categories);
  }, [data]);

  // Sync fetched data to store
  useEffect(() => {
    if (data?.categories) {
      setCategories(categoriasDtoParaEntidade(data.categories));
    }
  }, [data?.categories, setCategories]);

  useEffect(() => {
    if (data?.categories) {
      setProducts(produtosDtoParaEntidade(data.categories));
    }
  }, [data?.categories, setProducts]);

  // Filter products by search query (global search across all categories)
  const filteredProducts = useMemo(() => {
    if (searchQuery.trim() === '') {
      return [];
    }
    const query = searchQuery.toLowerCase().trim();
    return products.filter((p) => p.nome.toLowerCase().includes(query));
  }, [products, searchQuery]);

  const handleCategoryClick = (categoryId: string) => {
    window.location.href = `/menu/${categoryId}?restaurant=${restaurantId}`;
  };

  const handleProductClick = (productId: string) => {
    window.location.href = `/product/${productId}?restaurant=${restaurantId}`;
  };

  const isSearching = searchQuery.trim() !== '';

  return (
    <div className={styles.container}>
      <CustomerHeader />

      <div className={styles.pageHeader}>
        <h1 className={styles.title} data-testid="page-title">
          Cardápio
        </h1>
        <p className={styles.subtitle}>
          {isLoading ? 'Carregando...' : `${transformedCategories.length} categorias`}
        </p>
      </div>

      <div className={styles.searchContainer}>
        <SearchBar />
      </div>

      <main className={styles.main}>
        {error && (
          <div className={styles.error} role="alert">
            <p>Erro ao carregar cardápio: {error.message}</p>
          </div>
        )}

        {isSearching ? (
          <>
            <div className={styles.searchResultsHeader}>
              <h2 className={styles.sectionTitle}>Resultados para &quot;{searchQuery}&quot;</h2>
              <span className={styles.resultCount}>
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}{' '}
                encontrado{filteredProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            {filteredProducts.length > 0 ? (
              <ProductList
                products={filteredProducts}
                isLoading={isLoading}
                onProductClick={handleProductClick}
              />
            ) : (
              <div className={styles.noResults}>
                <p>Nenhum produto encontrado.</p>
                <p className={styles.noResultsHint}>
                  Tente buscar por outro termo ou{' '}
                  <Link
                    href={`/restaurantes/${restaurantId}/cardapio`}
                    className={styles.clearLink}
                  >
                    ver todas as categorias
                  </Link>
                  .
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>Categorias</h2>
            <CategoryList
              categories={transformedCategories}
              isLoading={isLoading}
              onCategoryClick={handleCategoryClick}
            />
          </>
        )}
      </main>
    </div>
  );
}
