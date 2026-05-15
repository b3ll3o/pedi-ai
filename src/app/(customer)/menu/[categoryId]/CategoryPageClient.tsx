'use client';

import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMenuStore } from '@/infrastructure/persistence/menuStore';
import { DietaryFilter } from '@/components/menu/DietaryFilter';
import { ProductList } from '@/components/menu/ProductList';
import { SearchBar } from '@/components/menu/SearchBar';
import type { DietaryLabel } from '@/components/menu/DietaryFilter';
import styles from './page.module.css';

interface CategoryPageClientProps {
  categoryId: string;
  restaurantId: string;
}

// Map store dietary labels to component dietary labels
function toComponentDietaryLabel(label: string): DietaryLabel | null {
  const mapping: Record<string, DietaryLabel> = {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    gluten_free: 'gluten-free',
    dairy_free: 'lactose-free',
    sugar_free: 'sugar-free',
    organic: 'organic',
  };
  return mapping[label] ?? null;
}

// Map component dietary labels to store dietary labels
function toStoreDietaryLabel(label: DietaryLabel): import('@/infrastructure/persistence/menuStore').DietaryLabel {
  const mapping: Record<DietaryLabel, string> = {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    'gluten-free': 'gluten_free',
    'lactose-free': 'dairy_free',
    'sugar-free': 'sugar_free',
    organic: 'organic',
  };
  return mapping[label] as import('@/infrastructure/persistence/menuStore').DietaryLabel;
}

export default function CategoryPageClient({ categoryId, restaurantId }: CategoryPageClientProps) {
  const router = useRouter();
  const categories = useMenuStore((state) => state.categories);
  const storeProducts = useMenuStore((state) => state.products);
  const storeDietaryFilters = useMenuStore((state) => state.dietaryFilters);
  const searchQuery = useMenuStore((state) => state.searchQuery);
  const isLoading = useMenuStore((state) => state.isLoading);
  const setSelectedCategory = useMenuStore((state) => state.setSelectedCategory);
  const toggleDietaryFilter = useMenuStore((state) => state.toggleDietaryFilter);
  const setCategories = useMenuStore((state) => state.setCategories);
  const setProducts = useMenuStore((state) => state.setProducts);
  const setIsLoading = useMenuStore((state) => state.setIsLoading);
  const setError = useMenuStore((state) => state.setError);
  // Fetch menu data on mount - always fetch to ensure we have latest data
  useEffect(() => {
    async function fetchMenuData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/menu?restaurant_id=${restaurantId}`);
        if (!response.ok) throw new Error('Failed to fetch menu');
        const data = await response.json();

        setCategories(data.categories || []);
        setProducts(data.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMenuData();
  }, [restaurantId, setCategories, setProducts, setIsLoading, setError]);

  // Get category by ID
  const category = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  // Convert store dietary filters to component dietary filters
  const componentDietaryFilters = useMemo(() => {
    return storeDietaryFilters
      .map(toComponentDietaryLabel)
      .filter((f): f is DietaryLabel => f !== null);
  }, [storeDietaryFilters]);

  // Filter products by category + dietary + search
  // When searching, show products from ALL categories (search is global)
  const products = useMemo(() => {
    let filtered = storeProducts;

    // Only filter by category if NOT searching
    if (searchQuery.trim() === '') {
      filtered = filtered.filter((p) => p.category_id === categoryId);
    }

    // Filter by dietary labels (AND logic)
    if (storeDietaryFilters.length > 0) {
      filtered = filtered.filter((p) => {
        const productLabels = p.dietary_labels ?? [];
        return storeDietaryFilters.every((label) => productLabels.includes(label));
      });
    }

    // Filter by search query (case-insensitive, includes)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [storeProducts, categoryId, storeDietaryFilters, searchQuery]);

  // Set category on mount/unmount
  useEffect(() => {
    setSelectedCategory(categoryId);
    return () => setSelectedCategory(null);
  }, [categoryId, setSelectedCategory]);

  const handleDietaryFilterChange = (filters: DietaryLabel[]) => {
    const currentStoreLabels = useMenuStore.getState().dietaryFilters;
    const currentComponentLabels = currentStoreLabels
      .map(toComponentDietaryLabel)
      .filter((f): f is DietaryLabel => f !== null);

    // Remove labels that are no longer selected
    currentComponentLabels
      .filter((f) => !filters.includes(f))
      .forEach((f) => toggleDietaryFilter(toStoreDietaryLabel(f)));

    // Add labels that are newly selected
    filters
      .filter((f) => !currentComponentLabels.includes(f))
      .forEach((f) => toggleDietaryFilter(toStoreDietaryLabel(f)));
  };

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  if (!category) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h1>Categoria não encontrada</h1>
          <Link href={`/restaurantes/${restaurantId}/cardapio`} className={styles.backLink}>
            Voltar ao menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol className={styles.breadcrumbList}>
          <li>
            <Link href={`/restaurantes/${restaurantId}/cardapio`} className={styles.breadcrumbLink}>
              Menu
            </Link>
          </li>
          <li className={styles.breadcrumbSeparator} aria-hidden="true">
            /
          </li>
          <li className={styles.breadcrumbCurrent}>
            {category.name}
          </li>
        </ol>
      </nav>

      {/* Back Button */}
      <Link href={`/restaurantes/${restaurantId}/cardapio`} className={styles.backButton}>
        <span aria-hidden="true">&larr;</span> Voltar ao menu
      </Link>

      {/* Category Header */}
      <header className={styles.header}>
        {category.image_url ? (
          <div className={styles.headerImage}>
            <Image
              src={category.image_url}
              alt={category.name}
              fill
              className={styles.image}
              sizes="100vw"
              priority
            />
          </div>
        ) : (
          <div className={styles.headerPlaceholder}>
            <span className={styles.headerInitial}>
              {category.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className={styles.headerContent}>
          <h1 className={styles.categoryName}>{category.name}</h1>
          {category.description && (
            <p className={styles.categoryDescription}>{category.description}</p>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <SearchBar />
      </div>

      {/* Dietary Filters */}
      <div className={styles.filtersContainer}>
        <DietaryFilter
          selectedFilters={componentDietaryFilters}
          onFilterChange={handleDietaryFilterChange}
        />
      </div>

      {/* Product Grid */}
      <main className={styles.main}>
        <ProductList
          products={products}
          isLoading={isLoading}
          selectedCategoryId={categoryId}
          onProductClick={handleProductClick}
        />
      </main>
    </div>
  );
}
