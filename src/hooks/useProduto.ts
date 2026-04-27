/**
 * useProduto Hook
 * Hook para buscar detalhes de um produto usando use cases do application layer.
 */

import { useQuery } from '@tanstack/react-query';
import {
  ObterDetalheProdutoUseCase,
  type ProdutoDetalhe,
} from '@/application/cardapio/services/ObterDetalheProdutoUseCase';
import {
  ItemCardapioRepository,
  ModificadorGrupoRepository,
} from '@/infrastructure/persistence/repositories';
import { db } from '@/infrastructure/persistence/database';

export interface ProdutoDetalheResponse {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  dietary_labels: string[] | null;
  available: boolean;
  category: { id: string; name: string };
  modifier_groups: Array<{
    id: string;
    name: string;
    required: boolean;
    min_selections: number;
    max_selections: number;
    values: Array<{
      id: string;
      name: string;
      price_adjustment: number;
    }>;
  }>;
}

// Transformação de domain entities para formato esperado
function transformarProdutoDetalhe(detalhe: ProdutoDetalhe) {
  return {
    id: detalhe.produto.id,
    name: detalhe.produto.nome,
    description: detalhe.produto.descricao,
    image_url: detalhe.produto.imagemUrl,
    price: detalhe.produto.preco.valor,
    dietary_labels: detalhe.produto.labelsDieteticos.map((l) => l.toString()),
    available: detalhe.produto.ativo,
    category: {
      id: detalhe.produto.categoriaId,
      name: '', // Categoria não tem nome no ItemCardapio, seria necessário buscar
    },
      modifier_groups: detalhe.modificadores.map((grupo) => ({
        id: grupo.id,
        name: grupo.nome,
        required: grupo.obrigatorio,
        min_selections: grupo.minSelecoes,
        max_selections: grupo.maxSelecoes,
        values: grupo.valoresAtivos.map((valor) => ({
          id: valor.id,
          name: valor.nome,
          price_adjustment: valor.ajustePreco.valor,
        })),
      })),
  };
}

/**
 * Hook para buscar detalhes de um produto com seus modificadores.
 * Usa ObterDetalheProdutoUseCase do application layer.
 *
 * @param produtoId - ID do produto
 * @param restauranteId - ID do restaurante (para validação)
 * @returns UseQueryResult com detalhes do produto
 */
export function useProduto(produtoId: string, _restauranteId?: string) {
  return useQuery<ProdutoDetalheResponse>({
    queryKey: ['produto', produtoId],
    queryFn: async () => {
      // Instanciar repositories com o banco de dados
      const itemCardapioRepo = new ItemCardapioRepository(db);
      const modificadorGrupoRepo = new ModificadorGrupoRepository(db);

      // Instanciar e executar use case
      const obterDetalheUseCase = new ObterDetalheProdutoUseCase(
        itemCardapioRepo,
        modificadorGrupoRepo
      );
      const detalhe = await obterDetalheUseCase.execute({ produtoId });

      // Transformar para formato esperado
      return transformarProdutoDetalhe(detalhe);
    },
    enabled: !!produtoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
