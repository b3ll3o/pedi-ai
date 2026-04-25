import { PediDatabase } from '../database';
import { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido, type ItemPedidoProps } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado';
import type { PedidoDbModel, StoredItemPedido } from './types';

export class PedidoRepository implements IPedidoRepository {
  constructor(private db: PediDatabase) {}

  async create(pedido: Pedido): Promise<Pedido> {
    const dbModel = this.toDbModel(pedido);
    await this.db.pedidos.put(dbModel);
    return pedido;
  }

  async findById(id: string): Promise<Pedido | null> {
    const dbModel = await this.db.pedidos.get(id);
    if (!dbModel) return null;
    return this.fromDbModel(dbModel);
  }

  async findByClienteId(clienteId: string): Promise<Pedido[]> {
    const dbModels = await this.db.pedidos.where('clienteId').equals(clienteId).toArray();
    return dbModels.map((m: PedidoDbModel) => this.fromDbModel(m));
  }

  async findByMesaId(mesaId: string): Promise<Pedido[]> {
    const dbModels = await this.db.pedidos.where('mesaId').equals(mesaId).toArray();
    return dbModels.map((m: PedidoDbModel) => this.fromDbModel(m));
  }

  async findByRestauranteId(restauranteId: string): Promise<Pedido[]> {
    const dbModels = await this.db.pedidos.where('restauranteId').equals(restauranteId).toArray();
    return dbModels.map((m: PedidoDbModel) => this.fromDbModel(m));
  }

  async update(pedido: Pedido): Promise<Pedido> {
    const dbModel = this.toDbModel(pedido);
    await this.db.pedidos.put(dbModel);
    return pedido;
  }

  async delete(id: string): Promise<void> {
    await this.db.pedidos.delete(id);
  }

  private toDbModel(pedido: Pedido): PedidoDbModel {
    const itensSerialized = JSON.stringify(
      pedido.itens.map(item => this.itemPedidoToStored(item))
    );

    return {
      id: pedido.id,
      clienteId: pedido.clienteId,
      mesaId: pedido.mesaId,
      restauranteId: pedido.restauranteId,
      status: pedido.status.toString(),
      itens: itensSerialized,
      subtotal: JSON.stringify({ valor: pedido.subtotal.valor, moeda: pedido.subtotal.moeda }),
      tax: JSON.stringify({ valor: pedido.tax.valor, moeda: pedido.tax.moeda }),
      total: JSON.stringify({ valor: pedido.total.valor, moeda: pedido.total.moeda }),
      createdAt: pedido.createdAt,
      updatedAt: pedido.updatedAt,
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

  private fromDbModel(dbModel: PedidoDbModel): Pedido {
    const storedItens: StoredItemPedido[] = JSON.parse(dbModel.itens);
    const itens = storedItens.map(stored => this.storedToItemPedido(stored));

    const subtotalParsed = JSON.parse(dbModel.subtotal);
    const taxParsed = JSON.parse(dbModel.tax);
    const totalParsed = JSON.parse(dbModel.total);

    const props = {
      id: dbModel.id,
      clienteId: dbModel.clienteId,
      mesaId: dbModel.mesaId,
      restauranteId: dbModel.restauranteId,
      status: StatusPedido.fromValue(dbModel.status),
      itens,
      subtotal: Dinheiro.criar(subtotalParsed.valor, subtotalParsed.moeda),
      tax: Dinheiro.criar(taxParsed.valor, taxParsed.moeda),
      total: Dinheiro.criar(totalParsed.valor, totalParsed.moeda),
      createdAt: dbModel.createdAt,
      updatedAt: dbModel.updatedAt,
    };

    return new Pedido(props);
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
