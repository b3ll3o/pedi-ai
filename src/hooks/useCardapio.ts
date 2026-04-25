/**
 * useCardapio Hook
 * Hook para buscar cardápio usando use cases do application layer.
 * Mantém interface compatível com o existing MenuResponse.
 */

import { useQuery } from '@tanstack/react-query';
import {
  ListarCardapioUseCase,
  type CardapioCompleto,
} from '@/application/cardapio/services/ListarCardapioUseCase';
import {
  CategoriaRepository,
  ItemCardapioRepository,
} from '@/infrastructure/persistence/repositories';
import { db } from '@/infrastructure/persistence/database';
import type { categories, products } from '@/lib/supabase/types';

// Transformação de domain entities para tipos Supabase (compatibilidade com a interface existente)
function transformarCardapio(cardapio: CardapioCompleto, restauranteId: string) {
  const categoriesTransformadas: (categories & { products: products[] })[] = cardapio.categorias.map(
    (cat) => ({
      id: cat.categoria.id,
      restaurant_id: cat.categoria.restauranteId,
      name: cat.categoria.nome,
      description: cat.categoria.descricao,
      image_url: cat.categoria.imagemUrl,
      sort_order: cat.categoria.ordemExibicao,
      active: cat.categoria.ativo,
      created_at: '',
      updated_at: '',
      products: cat.itens.map((item) => ({
        id: item.id,
        category_id: item.categoriaId,
        name: item.nome,
        description: item.descricao,
        image_url: item.imagemUrl,
        price: item.preco.valor,
        dietary_labels: item.labelsDieteticos.map((l) => l.toString()),
        available: item.ativo,
        sort_order: 0,
        created_at: '',
        updated_at: '',
      })),
    })
  );

  return {
    restaurant: {
      id: restauranteId,
      name: '',
      description: null,
      address: null,
      phone: null,
      logo_url: null,
      settings: null,
      created_at: '',
      updated_at: '',
    },
    categories: categoriesTransformadas,
  };
}

export type MenuResponse = {
  restaurant: {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    logo_url: string | null;
    settings: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  };
  categories: (categories & { products: products[] })[];
};

/**
 * Hook para buscar cardápio completo do restaurante.
 * Usa ListarCardapioUseCase do application layer.
 *
 * @param restauranteId - ID do restaurante
 * @returns UseQueryResult com cardápio transformada para formato compatível
 */
export function useCardapio(restauranteId: string) {
  return useQuery<MenuResponse>({
    queryKey: ['cardapio', restauranteId],
    queryFn: async () => {
      // Instanciar repositories com o banco de dados
      const categoriaRepo = new CategoriaRepository(db);
      const itemCardapioRepo = new ItemCardapioRepository(db);

      // Instanciar e executar use case
      const listarCardapioUseCase = new ListarCardapioUseCase(categoriaRepo, itemCardapioRepo);
      const cardapio = await listarCardapioUseCase.execute({ restauranteId });

      // Transformar para formato compatível com a interface existente
      return transformarCardapio(cardapio, restauranteId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
