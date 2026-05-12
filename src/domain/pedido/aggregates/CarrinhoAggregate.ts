import { ItemPedido } from '../entities/ItemPedido';
import { Pedido, PedidoProps } from '../entities/Pedido';
import { StatusPedido } from '../value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';

export interface CarrinhoProps {
  id: string;
  clienteId?: string;
  mesaId?: string;
  restauranteId: string;
  itens: ItemPedido[];
  metodoPagamento?: MetodoPagamento;
  createdAt: Date;
  updatedAt: Date;
}

export class CarrinhoAggregate {
  private props: CarrinhoProps;

  constructor(props: CarrinhoProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get clienteId(): string | undefined {
    return this.props.clienteId;
  }

  get mesaId(): string | undefined {
    return this.props.mesaId;
  }

  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get itens(): ItemPedido[] {
    return [...this.props.itens];
  }

  get metodoPagamento(): MetodoPagamento | undefined {
    return this.props.metodoPagamento;
  }

  get subtotal(): Dinheiro {
    return this.props.itens.reduce((acc, item) => acc.somar(item.subtotal), Dinheiro.ZERO);
  }

  get isEmpty(): boolean {
    return this.props.itens.length === 0;
  }

  adicionarItem(item: ItemPedido): void {
    const existente = this.props.itens.find(i => i.id === item.id);
    if (existente) {
      existente.atualizarQuantidade(existente.quantidade + item.quantidade);
    } else {
      this.props.itens.push(item);
    }
    this.props.updatedAt = new Date();
  }

  removerItem(itemId: string): void {
    const index = this.props.itens.findIndex(i => i.id === itemId);
    if (index !== -1) {
      this.props.itens.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  atualizarQuantidade(itemId: string, quantidade: number): void {
    const item = this.props.itens.find(i => i.id === itemId);
    if (item) {
      if (quantidade <= 0) {
        this.removerItem(itemId);
      } else {
        item.atualizarQuantidade(quantidade);
        this.props.updatedAt = new Date();
      }
    }
  }

  definirMetodoPagamento(metodo: MetodoPagamento): void {
    this.props.metodoPagamento = metodo;
    this.props.updatedAt = new Date();
  }

  limpar(): void {
    this.props.itens = [];
    this.props.metodoPagamento = undefined;
    this.props.updatedAt = new Date();
  }

  toPedido(id: string, taxaServico: number = 0): Pedido {
    if (this.isEmpty) {
      throw new Error('Não é possível criar pedido com carrinho vazio');
    }

    const subtotal = this.subtotal;
    const tax = Dinheiro.criar(Math.round(subtotal.valor * taxaServico), subtotal.moeda);
    const total = subtotal.somar(tax);

    const pedidoProps: PedidoProps = {
      id,
      clienteId: this.props.clienteId,
      mesaId: this.props.mesaId,
      restauranteId: this.props.restauranteId,
      status: StatusPedido.RECEIVED,
      itens: [...this.props.itens],
      subtotal,
      tax,
      total,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Pedido.criar(pedidoProps);
  }

  static criar(props: Omit<CarrinhoProps, 'createdAt' | 'updatedAt' | 'itens'>): CarrinhoAggregate {
    return new CarrinhoAggregate({
      ...props,
      itens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
