/**
 * Use Case: Criar Pedido a partir de input da API
 *
 * Extrai a lógica de criação de pedido da route API para o domínio.
 * A route API agora apenas recebe HTTP e delega para este use case.
 */

import { randomUUID } from 'crypto';
import type { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado';

export interface ItemInput {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  modificadores?: Array<{
    grupoId: string;
    grupoNome: string;
    modificadorId: string;
    modificadorNome: string;
    precoAdicional: number;
  }>;
  observacao?: string;
}

export interface CriarPedidoFromInputInput {
  restauranteId: string;
  mesaId?: string;
  clienteId?: string;
  itens: ItemInput[];
}

export interface CriarPedidoFromInputOutput {
  id: string;
  status: string;
  createdAt: string;
}

export class CriarPedidoFromInputUseCase {
  constructor(private readonly pedidoRepo: IPedidoRepository) {}

  async execute(input: CriarPedidoFromInputInput): Promise<CriarPedidoFromInputOutput> {
    // Validar input
    if (!input.restauranteId) {
      throw new Error('restauranteId é obrigatório');
    }
    if (!input.mesaId) {
      throw new Error('mesaId é obrigatório');
    }
    if (!input.itens || input.itens.length === 0) {
      throw new Error('itens não pode ser vazio');
    }

    // Construir itens do pedido
    const itensPedido = input.itens.map(item => {
      const modificadores = (item.modificadores || []).map(
        mod =>
          new ModificadorSelecionado({
            grupoId: mod.grupoId,
            grupoNome: mod.grupoNome,
            modificadorId: mod.modificadorId,
            modificadorNome: mod.modificadorNome,
            precoAdicional: mod.precoAdicional,
          })
      );

      return ItemPedido.criar({
        id: randomUUID(),
        pedidoId: undefined,
        produtoId: item.produtoId,
        nome: item.nome,
        precoUnitario: Dinheiro.criar(item.precoUnitario, 'BRL'),
        quantidade: item.quantidade,
        modificadoresSelecionados: modificadores,
        observacao: item.observacao,
      });
    });

    // Criar pedido
    const pedido = Pedido.criar({
      id: randomUUID(),
      restauranteId: input.restauranteId,
      mesaId: input.mesaId,
      clienteId: input.clienteId,
      status: StatusPedido.RECEIVED,
      itens: itensPedido,
    });

    // Persistir
    const pedidoCriado = await this.pedidoRepo.create(pedido);

    return {
      id: pedidoCriado.id,
      status: pedidoCriado.status.toString(),
      createdAt: pedidoCriado.createdAt.toISOString(),
    };
  }
}
