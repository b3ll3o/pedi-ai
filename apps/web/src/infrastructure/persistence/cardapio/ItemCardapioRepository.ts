import { PediDatabase } from '../database';
import { IItemCardapioRepository } from '@/domain/cardapio/repositories/IItemCardapioRepository';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico';
import type { ItemCardapioDbModel } from '../types';

export class ItemCardapioRepository implements IItemCardapioRepository {
  constructor(private db: PediDatabase) {}

  async buscarPorId(id: string): Promise<ItemCardapio | null> {
    const dbModel = await this.db.itens_cardapio.get(id);
    if (!dbModel) return null;
    return this.fromDbModel(dbModel);
  }

  async buscarPorCategoria(categoriaId: string): Promise<ItemCardapio[]> {
    const dbModels = await this.db.itens_cardapio
      .where('categoriaId')
      .equals(categoriaId)
      .toArray();
    return dbModels.map((m: ItemCardapioDbModel) => this.fromDbModel(m));
  }

  async buscarPorRestaurante(restauranteId: string): Promise<ItemCardapio[]> {
    const dbModels = await this.db.itens_cardapio
      .where('restauranteId')
      .equals(restauranteId)
      .toArray();
    return dbModels.map((m: ItemCardapioDbModel) => this.fromDbModel(m));
  }

  async buscarAtivos(categoriaId: string): Promise<ItemCardapio[]> {
    const dbModels = await this.db.itens_cardapio
      .where('categoriaId')
      .equals(categoriaId)
      .toArray();
    return dbModels
      .filter((m: ItemCardapioDbModel) => m.ativo)
      .map((m: ItemCardapioDbModel) => this.fromDbModel(m));
  }

  async buscarPorIds(ids: string[]): Promise<ItemCardapio[]> {
    const dbModels = await this.db.itens_cardapio.where('id').anyOf(ids).toArray();
    return dbModels.map((m: ItemCardapioDbModel) => this.fromDbModel(m));
  }

  async salvar(item: ItemCardapio): Promise<ItemCardapio> {
    const dbModel = this.toDbModel(item);
    await this.db.itens_cardapio.put(dbModel);
    return item;
  }

  async salvarMany(itens: ItemCardapio[]): Promise<ItemCardapio[]> {
    const dbModels = itens.map((item) => this.toDbModel(item));
    await this.db.itens_cardapio.bulkPut(dbModels);
    return itens;
  }

  async excluir(id: string): Promise<void> {
    await this.db.itens_cardapio.delete(id);
  }

  private toDbModel(item: ItemCardapio): ItemCardapioDbModel {
    return {
      id: item.id,
      categoriaId: item.categoriaId,
      restauranteId: item.restauranteId ?? '',
      nome: item.nome,
      descricao: item.descricao,
      preco: JSON.stringify({ valor: item.preco.valor, moeda: item.preco.moeda }),
      imagemUrl: item.imagemUrl,
      tipo: item.tipo.toString(),
      labelsDieteticos: JSON.stringify(item.labelsDieteticos.map((l) => l.toString())),
      ativo: item.ativo,
      criadoEm: item.criadoEm,
      atualizadoEm: item.atualizadoEm,
      deletedAt: item.deletedAt,
      version: item.version,
    };
  }

  private fromDbModel(dbModel: ItemCardapioDbModel): ItemCardapio {
    const precoParsed = JSON.parse(dbModel.preco);
    const labelsArray: string[] = JSON.parse(dbModel.labelsDieteticos);

    return ItemCardapio.reconstruir({
      id: dbModel.id,
      categoriaId: dbModel.categoriaId,
      restauranteId: dbModel.restauranteId,
      nome: dbModel.nome,
      descricao: dbModel.descricao,
      preco: Dinheiro.criar(precoParsed.valor, precoParsed.moeda),
      imagemUrl: dbModel.imagemUrl,
      tipo: TipoItemCardapio.fromValue(dbModel.tipo),
      labelsDieteticos: LabelDietetico.fromArray(labelsArray),
      ativo: dbModel.ativo,
      criadoEm: dbModel.criadoEm,
      atualizadoEm: dbModel.atualizadoEm,
      deletedAt: dbModel.deletedAt,
      version: dbModel.version,
    });
  }
}
