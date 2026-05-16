import { PediDatabase } from '../database';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import type { ModificadorGrupoDbModel, ModificadorValorDbModel } from '../types';

interface StoredModificadorValor {
  id: string;
  modificadorGrupoId: string;
  nome: string;
  ajustePrecoValor: number;
  ajustePrecoMoeda: string;
  ativo: boolean;
}

export class ModificadorGrupoRepository implements IModificadorGrupoRepository {
  constructor(private db: PediDatabase) {}

  async buscarPorId(id: string): Promise<ModificadorGrupo | null> {
    const dbModel = await this.db.modificadores_grupo.get(id);
    if (!dbModel) return null;
    return this.fromDbModel(dbModel);
  }

  async buscarPorRestaurante(restauranteId: string): Promise<ModificadorGrupo[]> {
    const dbModels = await this.db.modificadores_grupo
      .where('restauranteId')
      .equals(restauranteId)
      .toArray();
    return dbModels.map((m: ModificadorGrupoDbModel) => this.fromDbModel(m));
  }

  async buscarPorProduto(_produtoId: string): Promise<ModificadorGrupo[]> {
    // Buscar todos os grupos e filtrar pelos que contêm o produto
    // Esta é uma implementação simplificada - em produção,
    // seria melhor ter uma tabela de relação
    const dbModels = await this.db.modificadores_grupo.toArray();

    // Por enquanto, retornamos todos - seria necessário ter uma relação
    // entre produtos e grupos de modificadores
    return dbModels.map((m: ModificadorGrupoDbModel) => this.fromDbModel(m));
  }

  async salvar(grupo: ModificadorGrupo): Promise<ModificadorGrupo> {
    const dbModel = this.toDbModel(grupo);
    await this.db.modificadores_grupo.put(dbModel);

    // Salvar valores individualmente
    for (const valor of grupo.valores) {
      const valorDbModel = this.valorToDbModel(valor);
      await this.db.modificadores_valor.put(valorDbModel);
    }

    return grupo;
  }

  async salvarMany(grupos: ModificadorGrupo[]): Promise<ModificadorGrupo[]> {
    for (const grupo of grupos) {
      await this.salvar(grupo);
    }
    return grupos;
  }

  async excluir(id: string): Promise<void> {
    // Excluir valores primeiro
    await this.db.modificadores_valor.where('modificadorGrupoId').equals(id).delete();
    // Excluir o grupo
    await this.db.modificadores_grupo.delete(id);
  }

  private toDbModel(grupo: ModificadorGrupo): ModificadorGrupoDbModel {
    return {
      id: grupo.id,
      restauranteId: grupo.restauranteId,
      nome: grupo.nome,
      obrigatorio: grupo.obrigatorio,
      minSelecoes: grupo.minSelecoes,
      maxSelecoes: grupo.maxSelecoes,
      valores: JSON.stringify(grupo.valores.map((v) => this.valorToStored(v))),
      ativo: grupo.ativo,
    };
  }

  private valorToDbModel(valor: ModificadorValor): ModificadorValorDbModel {
    return {
      id: valor.id,
      modificadorGrupoId: valor.modificadorGrupoId,
      nome: valor.nome,
      ajustePreco: JSON.stringify({
        valor: valor.ajustePreco.valor,
        moeda: valor.ajustePreco.moeda,
      }),
      ativo: valor.ativo,
    };
  }

  private valorToStored(valor: ModificadorValor): StoredModificadorValor {
    return {
      id: valor.id,
      modificadorGrupoId: valor.modificadorGrupoId,
      nome: valor.nome,
      ajustePrecoValor: valor.ajustePreco.valor,
      ajustePrecoMoeda: valor.ajustePreco.moeda,
      ativo: valor.ativo,
    };
  }

  private fromDbModel(dbModel: ModificadorGrupoDbModel): ModificadorGrupo {
    const valoresStored: StoredModificadorValor[] = JSON.parse(dbModel.valores);
    const valores = valoresStored.map((v) => this.storedToValor(v));

    return ModificadorGrupo.reconstruir({
      id: dbModel.id,
      restauranteId: dbModel.restauranteId,
      nome: dbModel.nome,
      obrigatorio: dbModel.obrigatorio,
      minSelecoes: dbModel.minSelecoes,
      maxSelecoes: dbModel.maxSelecoes,
      valores,
      ativo: dbModel.ativo,
    });
  }

  private storedToValor(stored: StoredModificadorValor): ModificadorValor {
    return ModificadorValor.reconstruir({
      id: stored.id,
      modificadorGrupoId: stored.modificadorGrupoId,
      nome: stored.nome,
      ajustePreco: Dinheiro.criar(stored.ajustePrecoValor, stored.ajustePrecoMoeda),
      ativo: stored.ativo,
    });
  }
}
