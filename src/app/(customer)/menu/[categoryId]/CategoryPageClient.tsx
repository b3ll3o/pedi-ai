'use client';

import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMenuStore } from '@/stores/menuStore';
import { DietaryFilter } from '@/components/menu/DietaryFilter';
import { ProductList } from '@/components/menu/ProductList';
import { SearchBar } from '@/components/menu/SearchBar';
import type { DietaryLabel } from '@/components/menu/DietaryFilter';
import styles from './page.module.css';

interface CategoryPageClientProps {
  categoryId: string;
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
function toStoreDietaryLabel(label: DietaryLabel): import('@/stores/menuStore').DietaryLabel {
  const mapping: Record<DietaryLabel, string> = {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    'gluten-free': 'gluten_free',
    'lactose-free': 'dairy_free',
    'sugar-free': 'sugar_free',
    organic: 'organic',
  };
  return mapping[label] as import('@/stores/menuStore').DietaryLabel;
}

export default function CategoryPageClient({ categoryId }: CategoryPageClientProps) {
  const categories = useMenuStore((state) => state.categories);
  const storeDietaryFilters = useMenuStore((state) => state.dietaryFilters);
  const searchQuery = useMenuStore((state) => state.searchQuery);
  const isLoading = useMenuStore((state) => state.isLoading);
  const setSelectedCategory = useMenuStore((state) => state.setSelectedCategory);
  const toggleDietaryFilter = useMenuStore((state) => state.toggleDietaryFilter);

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
    let filtered = useMenuStore.getState().products;

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
  }, [categoryId, storeDietaryFilters, searchQuery]);

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

  if (!category) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h1>Categoria não encontrada</h1>
          <Link href="/menu" className={styles.backLink}>
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
            <Link href="/menu" className={styles.breadcrumbLink}>
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
      <Link href="/menu" className={styles.backButton}>
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
        />
      </main>
    </div>
  );
}
