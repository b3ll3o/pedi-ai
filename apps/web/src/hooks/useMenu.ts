import type { CategoryDTO, MenuResponse, RestaurantDTO } from '@pedi-ai/shared/types';
import { useQuery } from '@tanstack/react-query';

import { useMenuStore } from '@/infrastructure/persistence/menuStore';
import { getCachedMenu } from '@/lib/offline/cache';

export type { MenuResponse };

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

        return (await response.json()) as MenuResponse;
      } catch {
        // Offline ou erro → tentar usar cache do IndexedDB.
        // O cache retorna `unknown[]` (fronteira de confiança) e a validação
        // acontece dentro do menuStore via `setCategories`/`setProducts`.
        const cached = await getCachedMenu(restaurantId);
        if (cached) {
          useMenuStore.getState().setCategories(cached.categories as never[]);
          useMenuStore.getState().setProducts(cached.products as never[]);
          useMenuStore.getState().setModifierGroups(cached.modifiers as never[]);

          const restaurant: RestaurantDTO = {
            id: restaurantId,
            name: '',
            description: null,
            address: null,
            phone: null,
            logo_url: null,
            settings: null,
            created_at: '',
            updated_at: '',
          };

          // O cache é hidratado no store (acima) para servir consumidores
          // subsequentes. Aqui retornamos um MenuResponse mínimo para o
          // resultado do React Query.
          const categories: CategoryDTO[] = cached.categories
            .filter(
              (c): c is { id: string; name: string; restaurant_id: string } =>
                typeof c === 'object' && c !== null && 'id' in c && 'name' in c
            )
            .map((c) => ({
              id: c.id,
              restaurant_id: 'restaurant_id' in c ? c.restaurant_id : restaurantId,
              name: c.name,
              description: null,
              image_url: null,
              sort_order: 0,
              active: true,
              created_at: '',
              updated_at: '',
              products: cached.products
                .filter(
                  (p): p is { id: string; name: string; category_id: string; price: number } =>
                    typeof p === 'object' && p !== null && 'id' in p && 'category_id' in p
                )
                .filter((p) => p.category_id === c.id)
                .map((p) => ({
                  id: p.id,
                  category_id: p.category_id,
                  name: p.name,
                  description: null,
                  image_url: null,
                  price: typeof p.price === 'number' ? p.price : 0,
                  dietary_labels: [],
                  available: true,
                  sort_order: 0,
                  created_at: '',
                  updated_at: '',
                })),
            }));

          if (categories.length === 0) {
            throw new Error('Sem conexão e cardápio não disponível em cache');
          }

          return { restaurant, categories };
        }
        throw new Error('Sem conexão e cardápio não disponível em cache');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
