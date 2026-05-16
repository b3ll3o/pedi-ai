import { useQuery } from '@tanstack/react-query';
import type { categories, products, restaurants } from '@/lib/supabase/types';
import { getCachedMenu } from '@/lib/offline/cache';
import { useMenuStore } from '@/infrastructure/persistence/menuStore';

export type MenuResponse = {
  restaurant: restaurants;
  categories: (categories & { products: products[] })[];
};

/**
 * Fetches the menu for a specific restaurant.
 * Falls back to cached menu from IndexedDB if API fails (offline).
 *
 * @param restaurantId - The ID of the restaurant
 * @returns UseQueryResult<MenuResponse> with menu data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useMenu('restaurant-uuid');
 * ```
 */
export function useMenu(restaurantId: string) {
  return useQuery<MenuResponse>({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/menu?restaurant_id=${encodeURIComponent(restaurantId)}`);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(error.message ?? `Falha ao buscar cardápio: ${response.status}`);
        }

        return response.json();
      } catch {
        // Offline ou erro → tentar usar cache do IndexedDB
        const cached = await getCachedMenu(restaurantId);
        if (cached) {
          // Hydrate menuStore com dados do cache
          useMenuStore.getState().setCategories(cached.categories as categories[]);
          useMenuStore.getState().setProducts(cached.products as products[]);
          useMenuStore.getState().setModifierGroups(cached.modifiers as never[]);

          // Retornar estrutura compatível com MenuResponse
          return {
            restaurant: { id: restaurantId, name: '', created_at: '' } as restaurants,
            categories: cached.categories as (categories & { products: products[] })[],
          };
        }
        throw new Error('Sem conexão e cardápio não disponível em cache');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
