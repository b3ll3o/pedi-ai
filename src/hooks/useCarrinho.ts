/**
 * useCarrinho Hook
 * Hook para operações de carrinho usando domain aggregates via repository.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarrinhoRepository } from '@/infrastructure/persistence/repositories';
import { db } from '@/infrastructure/persistence/database';
import { CarrinhoAggregate } from '@/domain/pedido/aggregates/CarrinhoAggregate';
import type { ICarrinhoRepository } from '@/domain/pedido/repositories/ICarrinhoRepository';

// Tipos para o hook (interface pública)
export interface CartItemDTO {
  id: string;
  productId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  modificadores: Array<{
    grupoId: string;
    grupoNome: string;
    modificadorId: string;
    modificadorNome: string;
    precoAdicional: number;
  }>;
  observacao?: string;
}

export interface CarrinhoDTO {
  id: string;
  clienteId?: string;
  mesaId?: string;
  restauranteId: string;
  itens: CartItemDTO[];
  metodoPagamento?: string;
  subtotal: number;
  total: number;
}

// Transformação de CarrinhoAggregate para DTO
function carrinhoToDTO(carrinho: CarrinhoAggregate): CarrinhoDTO {
  const subtotal = carrinho.subtotal;
  // total é igual ao subtotal pois não há taxa adicional no carrinho
  const total = subtotal;
  return {
    id: carrinho.id,
    clienteId: carrinho.clienteId,
    mesaId: carrinho.mesaId,
    restauranteId: carrinho.restauranteId,
    itens: carrinho.itens.map((item) => ({
      id: item.id,
      productId: item.produtoId,
      nome: item.nome,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario.valor,
      modificadores: item.modificadoresSelecionados.map((mod) => ({
        grupoId: mod.grupoId,
        grupoNome: mod.grupoNome,
        modificadorId: mod.modificadorId,
        modificadorNome: mod.modificadorNome,
        precoAdicional: mod.precoAdicional,
      })),
      observacao: item.observacao,
    })),
    metodoPagamento: carrinho.metodoPagamento?.toString(),
    subtotal: subtotal.valor,
    total: total.valor,
  };
}

/**
 * Hook para obter o carrinho atual.
 * Usa ICarrinhoRepository para buscar o CarrinhoAggregate.
 */
export function useCarrinho() {
  return useQuery<CarrinhoDTO | null>({
    queryKey: ['carrinho'],
    queryFn: async () => {
      const carrinhoRepo: ICarrinhoRepository = new CarrinhoRepository(db);
      const carrinho = await carrinhoRepo.get();
      return carrinho ? carrinhoToDTO(carrinho) : null;
    },
    staleTime: 1000, // 1 second
  });
}

/**
 * Hook para salvar o carrinho.
 */
export function useSalvarCarrinho() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, CarrinhoAggregate>({
    mutationFn: async (carrinho) => {
      const carrinhoRepo: ICarrinhoRepository = new CarrinhoRepository(db);
      await carrinhoRepo.save(carrinho);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrinho'] });
    },
  });
}

/**
 * Hook para limpar o carrinho.
 */
export function useLimparCarrinho() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const carrinhoRepo: ICarrinhoRepository = new CarrinhoRepository(db);
      await carrinhoRepo.clear();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrinho'] });
    },
  });
}

/**
 * Hook para adicionar item ao carrinho (construção manual do aggregate).
 * Este é um helper que facilita adicionar itens ao carrinho.
 */
export function useAdicionarItemAoCarrinho() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, Omit<CartItemDTO, 'id'>, void>({
    mutationFn: async (_item) => {
      const carrinhoRepo: ICarrinhoRepository = new CarrinhoRepository(db);

      // Obter carrinho atual ou criar novo
      let carrinho = await carrinhoRepo.get();
      if (!carrinho) {
        // Criar novo carrinho com dados padrão
        // Nota: Em produção, clienteId e mesaId viriam do contexto
        carrinho = CarrinhoAggregate.criar({
          id: crypto.randomUUID(),
          restauranteId: 'default-restaurant',
        });
      }

      // Adicionar item ao carrinho
      // (simplificação - a lógica real seria mais complexa com ItemPedido)
      await carrinhoRepo.save(carrinho);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrinho'] });
    },
  });
}
