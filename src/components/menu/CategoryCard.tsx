'use client';

import Image from 'next/image';
import type { categories } from '@/lib/supabase/types';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: categories;
  onClick?: (categoryId: string) => void;
}

// Generate a consistent gradient based on category name
function getGradientPlaceholder(name: string): string {
  const gradients = [
    'var(--gradient-primary)',
    'var(--gradient-warm)',
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

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const handleClick = () => {
    onClick?.(category.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(category.id);
    }
  };

  const hasImage = Boolean(category.image_url);
  const gradientBg = getGradientPlaceholder(category.name);

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.card}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Ver categoria ${category.name}`}
        type="button"
      >
        <div className={styles.imageContainer}>
          {hasImage ? (
            <Image
              src={category.image_url!}
              alt={category.name}
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
                {category.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className={styles.content}>
          <h3 className={styles.name}>{category.name}</h3>
          {category.description && (
            <p className={styles.description}>{category.description}</p>
          )}
        </div>
      </button>
    </div>
  );
}
