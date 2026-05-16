/**
 * usePedido Hook
 * Hook para operações de pedido usando use cases do application layer.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CriarPedidoUseCase,
  type CriarPedidoInput,
  type CriarPedidoOutput,
} from '@/application/pedido/services/CriarPedidoUseCase';
import {
  AlterarStatusPedidoUseCase,
  type AlterarStatusPedidoInput,
  type AlterarStatusPedidoOutput,
} from '@/application/pedido/services/AlterarStatusPedidoUseCase';
import { PedidoRepository, CarrinhoRepository } from '@/infrastructure/persistence/repositories';
import { db } from '@/infrastructure/persistence/database';
import { EventDispatcher } from '@/domain/shared';
import type { Pedido } from '@/domain/pedido';

// Tipos para o hook
export interface PedidoResponse {
  id: string;
  clienteId?: string;
  mesaId?: string;
  restauranteId: string;
  status: string;
  itens: Array<{
    id: string;
    produtoId: string;
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
  }>;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

// Transformação de Pedido domain para formato do hook
function transformarPedido(pedido: Pedido): PedidoResponse {
  return {
    id: pedido.id,
    clienteId: pedido.clienteId,
    mesaId: pedido.mesaId,
    restauranteId: pedido.restauranteId,
    status: pedido.status.toString(),
    itens: pedido.itens.map((item) => ({
      id: item.id,
      produtoId: item.produtoId,
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
    subtotal: pedido.subtotal.valor,
    tax: pedido.tax.valor,
    total: pedido.total.valor,
    createdAt: pedido.createdAt,
    updatedAt: pedido.updatedAt,
  };
}

/**
 * Hook para criar um novo pedido a partir do carrinho.
 * Usa CriarPedidoUseCase do application layer.
 */
export function useCriarPedido() {
  const queryClient = useQueryClient();

  return useMutation<CriarPedidoOutput, Error, CriarPedidoInput>({
    mutationFn: async (input) => {
      // Instanciar repositories e event dispatcher
      const pedidoRepo = new PedidoRepository(db);
      const carrinhoRepo = new CarrinhoRepository(db);
      const eventDispatcher = EventDispatcher.getInstance();

      // Instanciar e executar use case
      const criarPedidoUseCase = new CriarPedidoUseCase(pedidoRepo, carrinhoRepo, eventDispatcher);

      return criarPedidoUseCase.execute(input);
    },
    onSuccess: () => {
      // Invalidar queries de pedidos após criar
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

/**
 * Hook para alterar o status de um pedido.
 * Usa AlterarStatusPedidoUseCase do application layer.
 */
export function useAlterarStatusPedido() {
  const queryClient = useQueryClient();

  return useMutation<AlterarStatusPedidoOutput, Error, AlterarStatusPedidoInput>({
    mutationFn: async (input) => {
      // Instanciar repository e event dispatcher
      const pedidoRepo = new PedidoRepository(db);
      const eventDispatcher = EventDispatcher.getInstance();

      // Instanciar e executar use case
      const alterarStatusUseCase = new AlterarStatusPedidoUseCase(pedidoRepo, eventDispatcher);

      return alterarStatusUseCase.execute(input);
    },
    onSuccess: (data) => {
      // Invalidar queries de pedidos após alterar status
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', data.pedido.id] });
    },
  });
}

/**
 * Hook para buscar um pedido por ID.
 */
export function usePedido(pedidoId: string) {
  return useQuery<PedidoResponse | null>({
    queryKey: ['pedido', pedidoId],
    queryFn: async () => {
      const pedidoRepo = new PedidoRepository(db);
      const pedido = await pedidoRepo.findById(pedidoId);
      return pedido ? transformarPedido(pedido) : null;
    },
    enabled: !!pedidoId,
    staleTime: 1000, // 1 second - pedidos mudam com frequência
  });
}

/**
 * Hook para buscar pedidos por cliente.
 */
export function usePedidosPorCliente(clienteId: string) {
  return useQuery<PedidoResponse[]>({
    queryKey: ['pedidos', 'cliente', clienteId],
    queryFn: async () => {
      const pedidoRepo = new PedidoRepository(db);
      const pedidos = await pedidoRepo.findByClienteId(clienteId);
      return pedidos.map(transformarPedido);
    },
    enabled: !!clienteId,
    staleTime: 5000, // 5 seconds
  });
}

/**
 * Hook para buscar pedidos por mesa.
 */
export function usePedidosPorMesa(mesaId: string) {
  return useQuery<PedidoResponse[]>({
    queryKey: ['pedidos', 'mesa', mesaId],
    queryFn: async () => {
      const pedidoRepo = new PedidoRepository(db);
      const pedidos = await pedidoRepo.findByMesaId(mesaId);
      return pedidos.map(transformarPedido);
    },
    enabled: !!mesaId,
    staleTime: 5000, // 5 seconds
  });
}
