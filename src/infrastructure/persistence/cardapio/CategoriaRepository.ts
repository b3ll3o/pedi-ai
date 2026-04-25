import { PediDatabase } from '../database';
import { ICategoriaRepository } from '@/domain/cardapio/repositories/ICategoriaRepository';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import type { CategoriaDbModel } from '../types';

export class CategoriaRepository implements ICategoriaRepository {
  constructor(private db: PediDatabase) {}

  async buscarPorId(id: string): Promise<Categoria | null> {
    const dbModel = await this.db.categorias.get(id);
    if (!dbModel) return null;
    return this.fromDbModel(dbModel);
  }

  async buscarPorRestaurante(restauranteId: string): Promise<Categoria[]> {
    const dbModels = await this.db.categorias
      .where('restauranteId')
      .equals(restauranteId)
      .toArray();
    return dbModels.map((m: CategoriaDbModel) => this.fromDbModel(m));
  }

  async buscarAtivas(restauranteId: string): Promise<Categoria[]> {
    const dbModels = await this.db.categorias
      .where('restauranteId')
      .equals(restauranteId)
      .toArray();
    return dbModels
      .filter((m: CategoriaDbModel) => m.ativo)
      .map((m: CategoriaDbModel) => this.fromDbModel(m));
  }

  async salvar(categoria: Categoria): Promise<Categoria> {
    const dbModel = this.toDbModel(categoria);
    await this.db.categorias.put(dbModel);
    return categoria;
  }

  async salvarMany(categorias: Categoria[]): Promise<Categoria[]> {
    const dbModels = categorias.map(c => this.toDbModel(c));
    await this.db.categorias.bulkPut(dbModels);
    return categorias;
  }

  async excluir(id: string): Promise<void> {
    await this.db.categorias.delete(id);
  }

  private toDbModel(categoria: Categoria): CategoriaDbModel {
    return {
      id: categoria.id,
      restauranteId: categoria.restauranteId,
      nome: categoria.nome,
      descricao: categoria.descricao,
      imagemUrl: categoria.imagemUrl,
      ordemExibicao: categoria.ordemExibicao,
      ativo: categoria.ativo,
    };
  }

  private fromDbModel(dbModel: CategoriaDbModel): Categoria {
    return Categoria.reconstruir({
      id: dbModel.id,
      restauranteId: dbModel.restauranteId,
      nome: dbModel.nome,
      descricao: dbModel.descricao,
      imagemUrl: dbModel.imagemUrl,
      ordemExibicao: dbModel.ordemExibicao,
      ativo: dbModel.ativo,
    });
  }
}
