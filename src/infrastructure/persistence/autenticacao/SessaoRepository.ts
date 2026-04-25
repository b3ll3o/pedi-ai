import { PediDatabase, SessaoRecord } from '../database';
import { ISessaoRepository } from '@/domain/autenticacao/repositories/ISessaoRepository';
import { Sessao } from '@/domain/autenticacao/entities/Sessao';

/**
 * Implementação do repositório de sessões usando Dexie (IndexedDB)
 */
export class SessaoRepository implements ISessaoRepository {
  constructor(private db: PediDatabase) {}

  async create(sessao: Sessao): Promise<Sessao> {
    const record: SessaoRecord = {
      id: sessao.id,
      usuarioId: sessao.usuarioId,
      token: sessao.token,
      expiracao: sessao.expiracao,
      dispositivo: sessao.dispositivo,
    };

    await this.db.sessoes.add(record);
    return sessao;
  }

  async findById(id: string): Promise<Sessao | null> {
    const record = await this.db.sessoes.get(id);
    if (!record) return null;
    return this.recordToSessao(record);
  }

  async findByToken(token: string): Promise<Sessao | null> {
    const record = await this.db.sessoes.where('token').equals(token).first();
    if (!record) return null;
    return this.recordToSessao(record);
  }

  async findByUsuarioId(usuarioId: string): Promise<Sessao[]> {
    const records = await this.db.sessoes.where('usuarioId').equals(usuarioId).toArray();
    return records.map(r => this.recordToSessao(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.sessoes.delete(id);
  }

  async deleteByUsuarioId(usuarioId: string): Promise<void> {
    await this.db.sessoes.where('usuarioId').equals(usuarioId).delete();
  }

  async deleteExpiradas(): Promise<void> {
    const agora = new Date();
    const expiradas = await this.db.sessoes.where('expiracao').below(agora).toArray();
    const idsExpirados = expiradas.map(s => s.id);
    await this.db.sessoes.bulkDelete(idsExpirados);
  }

  private recordToSessao(record: SessaoRecord): Sessao {
    return Sessao.reconstruir({
      id: record.id,
      usuarioId: record.usuarioId,
      token: record.token,
      expiracao: record.expiracao,
      dispositivo: record.dispositivo,
    });
  }
}
