import { Pagamento } from '../entities/Pagamento';

export interface IPagamentoRepository {
  salvar(pagamento: Pagamento): Promise<Pagamento>;
  buscarPorId(id: string): Promise<Pagamento | null>;
  buscarPorPedidoId(pedidoId: string): Promise<Pagamento | null>;
  buscarPorTransacaoId(transacaoId: string): Promise<Pagamento | null>;
  listarPorRestauranteId(restauranteId: string): Promise<Pagamento[]>;
  listarPorStatus(status: string): Promise<Pagamento[]>;
  excluir(id: string): Promise<void>;
}
