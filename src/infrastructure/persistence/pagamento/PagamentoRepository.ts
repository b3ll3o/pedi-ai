import { IPagamentoRepository } from '@/domain/pagamento/repositories/IPagamentoRepository';
import { Pagamento, PagamentoProps } from '@/domain/pagamento/entities/Pagamento';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { PediDatabase, PagamentoRecord } from '../database';

export class PagamentoRepository implements IPagamentoRepository {
  constructor(private db: PediDatabase) {}

  private toDomain(record: PagamentoRecord): Pagamento {
    const props: PagamentoProps = {
      id: record.id,
      pedidoId: record.pedidoId,
      metodo: MetodoPagamento.fromValue(record.metodo),
      status: StatusPagamento.fromValue(record.status),
      valor: Dinheiro.criar(record.valor.valor, record.valor.moeda),
      transacaoId: record.transacaoId,
      webhookId: record.webhookId,
      createdAt: record.createdAt,
      confirmedAt: record.confirmedAt,
    };
    return new Pagamento(props);
  }

  private toRecord(pagamento: Pagamento): PagamentoRecord {
    return {
      id: pagamento.id,
      pedidoId: pagamento.pedidoId,
      metodo: pagamento.metodo.toString(),
      status: pagamento.status.toString(),
      valor: {
        valor: pagamento.valor.valor,
        moeda: pagamento.valor.moeda,
      },
      transacaoId: pagamento.transacaoId,
      webhookId: pagamento.webhookId,
      createdAt: pagamento.createdAt,
      confirmedAt: pagamento.confirmedAt,
    };
  }

  async salvar(pagamento: Pagamento): Promise<Pagamento> {
    const record = this.toRecord(pagamento);
    await this.db.pagamentos.put(record);
    return pagamento;
  }

  async buscarPorId(id: string): Promise<Pagamento | null> {
    const record = await this.db.pagamentos.get(id);
    if (!record) return null;
    return this.toDomain(record);
  }

  async buscarPorPedidoId(pedidoId: string): Promise<Pagamento | null> {
    const records = await this.db.pagamentos.where('pedidoId').equals(pedidoId).toArray();
    if (records.length === 0) return null;
    return this.toDomain(records[0]);
  }

  async buscarPorTransacaoId(transacaoId: string): Promise<Pagamento | null> {
    const records = await this.db.pagamentos.where('transacaoId').equals(transacaoId).toArray();
    if (records.length === 0) return null;
    return this.toDomain(records[0]);
  }

  async listarPorRestauranteId(_restauranteId: string): Promise<Pagamento[]> {
    // Note: This would require a join with pedidos table in a real implementation
    // For now, we return all pagamentos - the application layer should filter
    const records = await this.db.pagamentos.toArray();
    return records.map(r => this.toDomain(r));
  }

  async listarPorStatus(status: string): Promise<Pagamento[]> {
    const records = await this.db.pagamentos.where('status').equals(status).toArray();
    return records.map(r => this.toDomain(r));
  }

  async excluir(id: string): Promise<void> {
    await this.db.pagamentos.delete(id);
  }
}
