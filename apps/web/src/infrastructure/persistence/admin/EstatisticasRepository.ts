import { PediDatabase } from '../database';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';

/**
 * Estatísticas de itens populares
 */
export interface EstatisticasItem {
  produtoId: string;
  nome: string;
  quantidade: number;
  faturamento: Dinheiro;
}

/**
 * Implementação do repositório de estatísticas usando Dexie (IndexedDB)
 */
export class EstatisticasRepository {
  constructor(private db: PediDatabase) {}

  /**
   * Obter pedidos por período para um restaurante
   */
  async obterPedidosPorPeriodo(
    restauranteId: string,
    inicio: Date,
    fim: Date
  ): Promise<
    Array<{
      id: string;
      status: StatusPedido;
      total: Dinheiro;
      createdAt: Date;
    }>
  > {
    const records = await this.db.pedidos.where('restauranteId').equals(restauranteId).toArray();

    return records
      .filter((r) => {
        const createdAt = new Date(r.createdAt);
        return createdAt >= inicio && createdAt <= fim;
      })
      .map((r) => ({
        id: r.id,
        status: StatusPedido.fromValue(r.status),
        total: this.parseDinheiro(r.total),
        createdAt: new Date(r.createdAt),
      }));
  }

  /**
   * Obter itens mais populares de um restaurante no período
   */
  async obterItensPopulares(restauranteId: string, periodo: string): Promise<EstatisticasItem[]> {
    const { dataInicio, dataFim } = this.calcularPeriodo(periodo);

    const pedidos = await this.obterPedidosPorPeriodo(restauranteId, dataInicio, dataFim);

    // Agregar itens dos pedidos
    const agregacao = new Map<string, { nome: string; quantidade: number; faturamento: number }>();

    for (const pedido of pedidos) {
      if (pedido.status.equals(StatusPedido.PAID) || pedido.status.equals(StatusPedido.DELIVERED)) {
        const pedidoRecord = await this.db.pedidos.get(pedido.id);
        if (!pedidoRecord) continue;

        const itens = this.parseItens(pedidoRecord.itens);
        for (const item of itens) {
          const existente = agregacao.get(item.produtoId);
          if (existente) {
            existente.quantidade += item.quantidade;
            existente.faturamento += item.subtotal;
          } else {
            agregacao.set(item.produtoId, {
              nome: item.nome,
              quantidade: item.quantidade,
              faturamento: item.subtotal,
            });
          }
        }
      }
    }

    // Converter para array e ordenar por quantidade
    const result: EstatisticasItem[] = [];
    agregacao.forEach((value, produtoId) => {
      result.push({
        produtoId,
        nome: value.nome,
        quantidade: value.quantidade,
        faturamento: Dinheiro.criar(Math.round(value.faturamento)),
      });
    });

    return result.sort((a, b) => b.quantidade - a.quantidade);
  }

  private calcularPeriodo(periodo: string): { dataInicio: Date; dataFim: Date } {
    const now = new Date();
    const fim = new Date(now);
    let inicio: Date;

    switch (periodo) {
      case 'dia':
        inicio = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'semana':
        inicio = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'mes':
        inicio = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'ano':
        inicio = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        inicio = new Date(now.setMonth(now.getMonth() - 1));
    }

    return { dataInicio: inicio, dataFim: fim };
  }

  private parseDinheiro(json: string): Dinheiro {
    const obj = JSON.parse(json);
    return Dinheiro.criar(obj.valor, obj.moeda);
  }

  private parseItens(itensJson: string): Array<{
    produtoId: string;
    nome: string;
    quantidade: number;
    subtotal: number;
  }> {
    const itens = JSON.parse(itensJson);
    return itens.map(
      (item: {
        produtoId: string;
        nome: string;
        quantidade: number;
        subtotal: { valor: number };
      }) => ({
        produtoId: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        subtotal: item.subtotal.valor,
      })
    );
  }
}
