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
        <p>Nenhuma categoria disponível</p>
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
          {/* CategoryCard will be imported here in task 2.1.4 */}
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
            {category.name}
          </div>
        </div>
      ))}
    </div>
  );
}