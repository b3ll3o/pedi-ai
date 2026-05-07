import { PediDatabase } from '../database';
import { ICarrinhoRepository } from '@/domain/pedido/repositories/ICarrinhoRepository';
import { CarrinhoAggregate, type CarrinhoProps } from '@/domain/pedido/aggregates/CarrinhoAggregate';
import { ItemPedido, type ItemPedidoProps } from '@/domain/pedido/entities/ItemPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado';
import type { CarrinhoDbModel } from '../types';

interface StoredItemPedido {
  id: string;
  pedidoId?: string;
  produtoId: string;
  nome: string;
  precoUnitarioValor: number;
  precoUnitarioMoeda: string;
  quantidade: number;
  modificadoresSelecionados: StoredModificadorSelecionado[];
  subtotalValor: number;
  subtotalMoeda: string;
  observacao?: string;
}

interface StoredModificadorSelecionado {
  grupoId: string;
  grupoNome: string;
  modificadorId: string;
  modificadorNome: string;
  precoAdicional: number;
}

export class CarrinhoRepository implements ICarrinhoRepository {
  constructor(private db: PediDatabase) {}

  async get(): Promise<CarrinhoAggregate | null> {
    const dbModels = await this.db.carrinhos.toArray();
    if (dbModels.length === 0) return null;

    // Retorna o primeiro carrinho encontrado (single cart per user)
    const dbModel = dbModels[0];
    return this.fromDbModel(dbModel);
  }

  async save(carrinho: CarrinhoAggregate): Promise<void> {
    const dbModel = this.toDbModel(carrinho);
    await this.db.carrinhos.put(dbModel);
  }

  async clear(): Promise<void> {
    await this.db.carrinhos.clear();
  }

  private toDbModel(carrinho: CarrinhoAggregate): CarrinhoDbModel {
    const itensSerialized = JSON.stringify(
      carrinho.itens.map(item => this.itemPedidoToStored(item))
    );

    return {
      id: carrinho.id,
      clienteId: carrinho.clienteId ?? undefined,
      mesaId: carrinho.mesaId ?? undefined,
      restauranteId: carrinho.restauranteId,
      itens: itensSerialized,
      metodoPagamento: carrinho.metodoPagamento?.toString() ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private itemPedidoToStored(item: ItemPedido): StoredItemPedido {
    return {
      id: item.id,
      pedidoId: item.pedidoId,
      produtoId: item.produtoId,
      nome: item.nome,
      precoUnitarioValor: item.precoUnitario.valor,
      precoUnitarioMoeda: item.precoUnitario.moeda,
      quantidade: item.quantidade,
      modificadoresSelecionados: item.modificadoresSelecionados.map(mod => ({
        grupoId: mod.grupoId,
        grupoNome: mod.grupoNome,
        modificadorId: mod.modificadorId,
        modificadorNome: mod.modificadorNome,
        precoAdicional: mod.precoAdicional,
      })),
      subtotalValor: item.subtotal.valor,
      subtotalMoeda: item.subtotal.moeda,
      observacao: item.observacao,
    };
  }

  private fromDbModel(dbModel: CarrinhoDbModel): CarrinhoAggregate {
    const storedItens: StoredItemPedido[] = JSON.parse(dbModel.itens);
    const itens = storedItens.map(stored => this.storedToItemPedido(stored));

    const props: CarrinhoProps = {
      id: dbModel.id,
      clienteId: dbModel.clienteId,
      mesaId: dbModel.mesaId,
      restauranteId: dbModel.restauranteId,
      itens,
      metodoPagamento: dbModel.metodoPagamento
        ? MetodoPagamento.fromValue(dbModel.metodoPagamento)
        : undefined,
      createdAt: dbModel.createdAt,
      updatedAt: dbModel.updatedAt,
    };

    return new CarrinhoAggregate(props);
  }

  private storedToItemPedido(stored: StoredItemPedido): ItemPedido {
    const props: ItemPedidoProps = {
      id: stored.id,
      pedidoId: stored.pedidoId,
      produtoId: stored.produtoId,
      nome: stored.nome,
      precoUnitario: Dinheiro.criar(stored.precoUnitarioValor, stored.precoUnitarioMoeda),
      quantidade: stored.quantidade,
      modificadoresSelecionados: stored.modificadoresSelecionados.map(
        mod =>
          new ModificadorSelecionado({
            grupoId: mod.grupoId,
            grupoNome: mod.grupoNome,
            modificadorId: mod.modificadorId,
            modificadorNome: mod.modificadorNome,
            precoAdicional: mod.precoAdicional,
          })
      ),
      subtotal: Dinheiro.criar(stored.subtotalValor, stored.subtotalMoeda),
      observacao: stored.observacao,
    };

    return new ItemPedido(props);
  }
}
