import { Sessao } from '../entities/Sessao';

export interface ISessaoRepository {
  create(sessao: Sessao): Promise<Sessao>;
  findById(id: string): Promise<Sessao | null>;
  findByToken(token: string): Promise<Sessao | null>;
  findByUsuarioId(usuarioId: string): Promise<Sessao[]>;
  delete(id: string): Promise<void>;
  deleteByUsuarioId(usuarioId: string): Promise<void>;
  deleteExpiradas(): Promise<void>;
}
