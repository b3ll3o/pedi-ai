import { EntityClass } from '@/domain/shared';
import { Dinheiro } from '../value-objects/Dinheiro';
import { ModificadorSelecionado } from '../value-objects/ModificadorSelecionado';

export interface ItemPedidoProps {
  id: string;
  pedidoId?: string;
  produtoId: string;
  nome: string;
  precoUnitario: Dinheiro;
  quantidade: number;
  modificadoresSelecionados: ModificadorSelecionado[];
  subtotal: Dinheiro;
  observacao?: string;
}

export class ItemPedido extends EntityClass<ItemPedidoProps> {
  get pedidoId(): string | undefined {
    return this.props.pedidoId;
  }

  get produtoId(): string {
    return this.props.produtoId;
  }

  get nome(): string {
    return this.props.nome;
  }

  get precoUnitario(): Dinheiro {
    return this.props.precoUnitario;
  }

  get quantidade(): number {
    return this.props.quantidade;
  }

  get modificadoresSelecionados(): ModificadorSelecionado[] {
    return [...this.props.modificadoresSelecionados];
  }

  get subtotal(): Dinheiro {
    return this.props.subtotal;
  }

  get observacao(): string | undefined {
    return this.props.observacao;
  }

  equals(other: EntityClass<ItemPedidoProps>): boolean {
    if (!(other instanceof ItemPedido)) return false;
    return this.id === other.id;
  }

  recalcularSubtotal(): void {
    let total = this.props.precoUnitario.multiplicar(this.props.quantidade);

    for (const mod of this.props.modificadoresSelecionados) {
      total = total.somar(
        Dinheiro.criar(mod.precoAdicional * this.props.quantidade, total.moeda)
      );
    }

    // Atualizar o subtotal diretamente no props
    Object.assign(this.props, { subtotal: total });
  }

  atualizarQuantidade(quantidade: number): void {
    Object.assign(this.props, { quantidade });
    this.recalcularSubtotal();
  }

  static criar(props: Omit<ItemPedidoProps, 'subtotal'>): ItemPedido {
    const item = new ItemPedido({
      ...props,
      subtotal: Dinheiro.ZERO,
    });
    item.recalcularSubtotal();
    return item;
  }
}
