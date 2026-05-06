'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantSearch } from '@/components/restaurant/RestaurantSearch';
import { RestaurantList } from '@/components/restaurant/RestaurantList';
import type { Restaurant } from '@/components/restaurant/RestaurantCard';
import styles from './page.module.css';

export default function RestaurantesPageClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/restaurants');

        if (!response.ok) {
          throw new Error('Erro ao carregar restaurantes');
        }

        const data = await response.json();
        setRestaurants(data.restaurants || []);
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar restaurantes');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) {
      return restaurants;
    }

    const query = searchQuery.toLowerCase().trim();
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query)
    );
  }, [restaurants, searchQuery]);

  const handleRestaurantClick = (id: string) => {
    router.push(`/restaurantes/${id}/cardapio`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Restaurantes</h1>
        <p className={styles.subtitle}>
          Escolha um restaurante para ver o cardápio
        </p>
      </header>

      <div className={styles.searchContainer}>
        <RestaurantSearch onSearch={setSearchQuery} />
      </div>

      <main className={styles.main}>
        {error && (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className={styles.retryButton}
            >
              Tentar novamente
            </button>
          </div>
        )}

        <RestaurantList
          restaurants={filteredRestaurants}
          isLoading={isLoading}
          onRestaurantClick={handleRestaurantClick}
        />

        {!isLoading && !error && filteredRestaurants.length === 0 && searchQuery && (
          <div className={styles.noResults}>
            <p>Nenhum restaurante encontrado para &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => setSearchQuery('')}
              className={styles.clearButton}
            >
              Limpar busca
            </button>
          </div>
        )}
      </main>
    </div>
  );
}