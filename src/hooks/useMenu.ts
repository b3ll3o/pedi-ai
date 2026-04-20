import { useQuery } from '@tanstack/react-query';
import type { categories, products, restaurants } from '@/lib/supabase/types';

export type MenuResponse = {
  restaurant: restaurants;
  categories: (categories & { products: products[] })[];
};

/**
 * Fetches the menu for a specific restaurant.
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
      const response = await fetch(
        `/api/menu?restaurant_id=${encodeURIComponent(restaurantId)}`
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message ?? `Failed to fetch menu: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}