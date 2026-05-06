'use client';

import { RestaurantCard, type Restaurant } from './RestaurantCard';
import styles from './RestaurantList.module.css';

interface RestaurantListProps {
  restaurants: Restaurant[];
  isLoading?: boolean;
  onRestaurantClick: (id: string) => void;
}

export function RestaurantList({
  restaurants,
  isLoading = false,
  onRestaurantClick,
}: RestaurantListProps) {
  if (isLoading) {
    return (
      <div className={styles.grid} data-testid="restaurant-list">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`skeleton-${index}`} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className={styles.empty} data-testid="restaurant-list-empty">
        <div className={styles.emptyIcon}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>Nenhum restaurante encontrado</p>
        <p className={styles.emptyHint}>
          Tente buscar por outro termo ou volte mais tarde.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.grid} data-testid="restaurant-list">
      {restaurants.map((restaurant, index) => (
        <div
          key={restaurant.id}
          className={styles.item}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <RestaurantCard
            restaurant={restaurant}
            onClick={onRestaurantClick}
          />
        </div>
      ))}
    </div>
  );
}