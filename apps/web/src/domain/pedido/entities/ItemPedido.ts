import { EntityClass } from '@/domain/shared';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

import { ModificadorSelecionado } from '../value-objects/ModificadorSelecionado';

/**
 * Limites de quantidade por item de pedido.
 *
 * MAX = 999 casa com o `@Max(999)` do DTO do backend (`orders.dto.ts`).
 * Definir aqui também evita que `precoUnitario * quantidade` extrapole
 * `Number.MAX_SAFE_INTEGER` (`2^53 - 1`) — em centavos, 999 × R$ 999.999,99
 * = ~1e9, muito abaixo do limite, mas é defesa em profundidade.
 */
const MIN_QUANTIDADE = 1;
const MAX_QUANTIDADE = 999;

function assertQuantidadeValida(quantidade: number): void {
  if (!Number.isInteger(quantidade)) {
    throw new Error(`quantidade deve ser inteiro, recebido: ${quantidade}`);
  }
  if (quantidade < MIN_QUANTIDADE || quantidade > MAX_QUANTIDADE) {
    throw new Error(
      `quantidade fora da faixa permitida [${MIN_QUANTIDADE}, ${MAX_QUANTIDADE}]: ${quantidade}`
    );
  }
}

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
      total = total.somar(Dinheiro.criar(mod.precoAdicional * this.props.quantidade, total.moeda));
    }

    // Atualizar o subtotal diretamente no props
    Object.assign(this.props, { subtotal: total });
  }

  atualizarQuantidade(quantidade: number): void {
    assertQuantidadeValida(quantidade);
    Object.assign(this.props, { quantidade });
    this.recalcularSubtotal();
  }

  static criar(props: Omit<ItemPedidoProps, 'subtotal'>): ItemPedido {
    assertQuantidadeValida(props.quantidade);
    const item = new ItemPedido({
      ...props,
      subtotal: Dinheiro.ZERO,
    });
    item.recalcularSubtotal();
    return item;
  }
}
