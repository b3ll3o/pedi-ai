import { AggregateRootClass } from '@/domain/shared';
import { StatusPedido } from '../value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { ItemPedido } from './ItemPedido';

export interface PedidoProps {
  id: string;
  clienteId?: string;
  mesaId?: string;
  restauranteId: string;
  status: StatusPedido;
  itens: ItemPedido[];
  subtotal: Dinheiro;
  tax: Dinheiro;
  total: Dinheiro;
  createdAt: Date;
  updatedAt: Date;
}

export class Pedido extends AggregateRootClass<PedidoProps> {
  get clienteId(): string | undefined {
    return this.props.clienteId;
  }

  get mesaId(): string | undefined {
    return this.props.mesaId;
  }

  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get status(): StatusPedido {
    return this.props.status;
  }

  get itens(): ItemPedido[] {
    return [...this.props.itens];
  }

  get subtotal(): Dinheiro {
    return this.props.subtotal;
  }

  get tax(): Dinheiro {
    return this.props.tax;
  }

  get total(): Dinheiro {
    return this.props.total;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get quantidadeItens(): number {
    return this.props.itens.reduce((acc, item) => acc + item.quantidade, 0);
  }

  equals(other: AggregateRootClass<PedidoProps>): boolean {
    if (!(other instanceof Pedido)) return false;
    return this.id === other.id;
  }

  adicionarItem(item: ItemPedido): void {
    const existente = this.props.itens.find(i => i.id === item.id);
    if (existente) {
      existente.atualizarQuantidade(existente.quantidade + item.quantidade);
    } else {
      this.props.itens.push(item);
    }
    this.atualizarTotais();
    this.touch();
  }

  removerItem(itemId: string): void {
    const index = this.props.itens.findIndex(i => i.id === itemId);
    if (index === -1) {
      throw new Error(`Item ${itemId} não encontrado no pedido`);
    }
    this.props.itens.splice(index, 1);
    this.atualizarTotais();
    this.touch();
  }

  alterarStatus(novoStatus: StatusPedido): void {
    if (this.props.status === novoStatus) return;

    Object.assign(this.props, { status: novoStatus });
    this.touch();
  }

  private touch(): void {
    Object.assign(this.props, { updatedAt: new Date() });
  }

  private atualizarTotais(): void {
    let novoSubtotal = Dinheiro.ZERO;

    for (const item of this.props.itens) {
      novoSubtotal = novoSubtotal.somar(item.subtotal);
    }

    const novoTotal = novoSubtotal.somar(this.props.tax);
    Object.assign(this.props, { subtotal: novoSubtotal, total: novoTotal });
  }

  static criar(props: Omit<PedidoProps, 'createdAt' | 'updatedAt' | 'subtotal' | 'tax' | 'total'>): Pedido {
    const now = new Date();
    const pedido = new Pedido({
      ...props,
      subtotal: Dinheiro.ZERO,
      tax: Dinheiro.ZERO,
      total: Dinheiro.ZERO,
      createdAt: now,
      updatedAt: now,
    });

    pedido.atualizarTotais();

    return pedido;
  }
}
