import { Pedido } from '../entities/Pedido';

export interface IPedidoRepository {
  create(pedido: Pedido): Promise<Pedido>;
  findById(id: string): Promise<Pedido | null>;
  findByClienteId(clienteId: string): Promise<Pedido[]>;
  findByMesaId(mesaId: string): Promise<Pedido[]>;
  findByRestauranteId(restauranteId: string): Promise<Pedido[]>;
  update(pedido: Pedido): Promise<Pedido>;
  delete(id: string): Promise<void>;
}
