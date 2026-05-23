import { Combo, ComboProps } from '@/domain/cardapio/entities/Combo';
import { IComboRepository } from '@/domain/cardapio/repositories/IComboRepository';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

import { PediDatabase } from '../database';
import type { ComboRecord } from '../database';

export class ComboRepository implements IComboRepository {
  constructor(private db: PediDatabase) {}

  async buscarPorId(id: string): Promise<Combo | null> {
    const dbModel = await this.db.combos.get(id);
    if (!dbModel) return null;
    return this.fromDbModel(dbModel);
  }

  async buscarPorRestaurante(restauranteId: string): Promise<Combo[]> {
    const dbModels = await this.db.combos.where('restauranteId').equals(restauranteId).toArray();
    return dbModels.map((m) => this.fromDbModel(m));
  }

  async buscarAtivos(restauranteId: string): Promise<Combo[]> {
    const dbModels = await this.db.combos.where('restauranteId').equals(restauranteId).toArray();
    return dbModels.filter((m) => m.ativo).map((m) => this.fromDbModel(m));
  }

  async salvar(combo: Combo): Promise<Combo> {
    const dbModel = this.toDbModel(combo);
    await this.db.combos.put(dbModel);
    return combo;
  }

  async excluir(id: string): Promise<void> {
    await this.db.combos.delete(id);
  }

  private toDbModel(combo: Combo): ComboRecord {
    return {
      id: combo.id,
      restauranteId: combo.restauranteId,
      nome: combo.nome,
      descricao: combo.descricao,
      precoBundle: JSON.stringify({
        valor: combo.precoBundle.valor,
        moeda: combo.precoBundle.moeda,
      }),
      imagemUrl: combo.imagemUrl,
      itens: JSON.stringify(combo.itens),
      ativo: combo.ativo,
    };
  }

  private fromDbModel(dbModel: ComboRecord): Combo {
    const precoParsed = JSON.parse(dbModel.precoBundle);
    const itensParsed = JSON.parse(dbModel.itens) as Array<{
      produtoId: string;
      quantidade: number;
    }>;

    const props: ComboProps = {
      id: dbModel.id,
      restauranteId: dbModel.restauranteId,
      nome: dbModel.nome,
      descricao: dbModel.descricao,
      precoBundle: Dinheiro.criar(precoParsed.valor, precoParsed.moeda),
      imagemUrl: dbModel.imagemUrl,
      itens: itensParsed,
      ativo: dbModel.ativo,
    };

    return Combo.reconstruir(props);
  }
}
