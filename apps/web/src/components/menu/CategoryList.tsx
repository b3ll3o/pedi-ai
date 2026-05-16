'use client';

import styles from './CategoryList.module.css';

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
}

interface CategoryListProps {
  categories: Category[];
  isLoading?: boolean;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryList({
  categories,
  isLoading = false,
  onCategoryClick,
}: CategoryListProps) {
  if (isLoading) {
    return (
      <div className={styles.grid} data-testid="menu-categories">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`skeleton-${index}`} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={styles.empty} data-testid="menu-categories">
        <div className={styles.emptyIcon}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 3h18v18H3z" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <p>Nenhuma categoria disponível</p>
        <p className={styles.emptyHint}>
          No momento, não há categorias no cardápio. Volte em breve!
        </p>
      </div>
    );
  }

  return (
    <div className={styles.grid} data-testid="menu-categories">
      {categories.map((category, index) => (
        <div
          key={category.id}
          className={styles.item}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div
            className={styles.categoryCard}
            onClick={() => onCategoryClick?.(category.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onCategoryClick?.(category.id);
              }
            }}
            data-testid={`menu-category-card-${category.id}`}
          >
            <div className={styles.categoryIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3h18v18H3z" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <h3 className={styles.categoryName}>{category.name}</h3>
            {category.description && (
              <p className={styles.categoryDescription}>{category.description}</p>
            )}
            <div className={styles.categoryArrow} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
