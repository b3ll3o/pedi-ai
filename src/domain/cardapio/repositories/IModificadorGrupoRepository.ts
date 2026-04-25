import { ModificadorGrupo, ModificadorGrupoProps } from '../entities/ModificadorGrupo';

export interface IModificadorGrupoRepository {
  buscarPorId(id: string): Promise<ModificadorGrupo | null>;
  buscarPorRestaurante(restauranteId: string): Promise<ModificadorGrupo[]>;
  buscarPorProduto(produtoId: string): Promise<ModificadorGrupo[]>;
  salvar(grupo: ModificadorGrupo): Promise<ModificadorGrupo>;
  salvarMany(grupos: ModificadorGrupo[]): Promise<ModificadorGrupo[]>;
  excluir(id: string): Promise<void>;
}
