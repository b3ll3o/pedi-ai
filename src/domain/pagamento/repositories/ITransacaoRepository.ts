import { Transacao } from '../entities/Transacao';

export interface ITransacaoRepository {
  salvar(transacao: Transacao): Promise<Transacao>;
  buscarPorId(id: string): Promise<Transacao | null>;
  buscarPorPagamentoId(pagamentoId: string): Promise<Transacao[]>;
  buscarPorProviderId(providerId: string): Promise<Transacao | null>;
  listarPorStatus(status: 'pending' | 'success' | 'failure'): Promise<Transacao[]>;
  excluir(id: string): Promise<void>;
}
