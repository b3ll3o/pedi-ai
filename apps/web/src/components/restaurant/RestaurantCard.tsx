'use client';

import Image from 'next/image';
import { MapPin, Clock } from 'lucide-react';
import styles from './RestaurantCard.module.css';

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  horarios: string | null;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: (id: string) => void;
}

export function RestaurantCard({ restaurant, onClick }: RestaurantCardProps) {
  return (
    <article
      className={styles.card}
      onClick={() => onClick(restaurant.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(restaurant.id);
        }
      }}
      data-testid={`restaurant-card-${restaurant.id}`}
      aria-label={`Ver cardápio de ${restaurant.name}`}
    >
      <div className={styles.imageContainer}>
        {restaurant.logo_url ? (
          <Image
            src={restaurant.logo_url}
            alt={`Logo de ${restaurant.name}`}
            fill
            className={styles.logo}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className={styles.logoPlaceholder}>
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
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{restaurant.name}</h3>

        {restaurant.description && <p className={styles.description}>{restaurant.description}</p>}

        <div className={styles.info}>
          {restaurant.address && (
            <div className={styles.infoRow}>
              <MapPin aria-hidden="true" className={styles.icon} />
              <span className={styles.infoText}>{restaurant.address}</span>
            </div>
          )}

          {restaurant.horarios && (
            <div className={styles.infoRow}>
              <Clock aria-hidden="true" className={styles.icon} />
              <span className={styles.infoText}>{restaurant.horarios}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.arrow} aria-hidden="true">
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
    </article>
  );
}
