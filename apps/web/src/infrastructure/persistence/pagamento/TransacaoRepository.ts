import { ITransacaoRepository } from '@/domain/pagamento/repositories/ITransacaoRepository';
import {
  Transacao,
  TransacaoProps,
  TipoTransacaoValue,
} from '@/domain/pagamento/entities/Transacao';
import { PediDatabase, TransacaoRecord } from '../database';

export class TransacaoRepository implements ITransacaoRepository {
  constructor(private db: PediDatabase) {}

  private toDomain(record: TransacaoRecord): Transacao {
    const props: TransacaoProps = {
      id: record.id,
      pagamentoId: record.pagamentoId,
      tipo: record.tipo as TipoTransacaoValue,
      providerId: record.providerId ?? '',
      status: record.status as 'pending' | 'success' | 'failure',
      payload: record.payload ? JSON.parse(record.payload) : {},
      createdAt: record.createdAt,
    };
    return new Transacao(props);
  }

  private toRecord(transacao: Transacao): TransacaoRecord {
    return {
      id: transacao.id,
      pagamentoId: transacao.pagamentoId,
      tipo: transacao.tipo,
      providerId: transacao.providerId,
      status: transacao.status,
      payload: JSON.stringify(transacao.payload),
      createdAt: transacao.createdAt,
    };
  }

  async salvar(transacao: Transacao): Promise<Transacao> {
    await this.db.transacoes.put(this.toRecord(transacao));
    return transacao;
  }

  async buscarPorId(id: string): Promise<Transacao | null> {
    const record = await this.db.transacoes.get(id);
    if (!record) return null;
    return this.toDomain(record);
  }

  async buscarPorPagamentoId(pagamentoId: string): Promise<Transacao[]> {
    const records = await this.db.transacoes.where('pagamentoId').equals(pagamentoId).toArray();
    return records.map((r) => this.toDomain(r));
  }

  async buscarPorProviderId(providerId: string): Promise<Transacao | null> {
    const records = await this.db.transacoes.where('providerId').equals(providerId).toArray();
    if (records.length === 0) return null;
    return this.toDomain(records[0]);
  }

  async listarPorStatus(status: 'pending' | 'success' | 'failure'): Promise<Transacao[]> {
    const records = await this.db.transacoes.where('status').equals(status).toArray();
    return records.map((r) => this.toDomain(r));
  }

  async excluir(id: string): Promise<void> {
    await this.db.transacoes.delete(id);
  }
}
