import { EntityClass } from '@/domain/shared';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

export interface ComboItemProps {
  produtoId: string;
  quantidade: number;
}

export interface ComboProps {
  id: string;
  restauranteId: string;
  nome: string;
  descricao: string | null;
  precoBundle: Dinheiro;
  imagemUrl: string | null;
  itens: ComboItemProps[];
  ativo: boolean;
}

export class Combo extends EntityClass<ComboProps> {
  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get nome(): string {
    return this.props.nome;
  }

  get descricao(): string | null {
    return this.props.descricao;
  }

  get precoBundle(): Dinheiro {
    return this.props.precoBundle;
  }

  get imagemUrl(): string | null {
    return this.props.imagemUrl;
  }

  get itens(): ComboItemProps[] {
    return [...this.props.itens];
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get quantidadeItens(): number {
    return this.props.itens.reduce((acc, item) => acc + item.quantidade, 0);
  }

  equals(other: EntityClass<ComboProps>): boolean {
    if (!(other instanceof Combo)) return false;
    return this.id === other.id;
  }

  contemProduto(produtoId: string): boolean {
    return this.props.itens.some((item) => item.produtoId === produtoId);
  }

  ativar(): void {
    Object.assign(this.props, { ativo: true });
  }

  desativar(): void {
    Object.assign(this.props, { ativo: false });
  }

  atualizarNome(novoNome: string): void {
    Object.assign(this.props, { nome: novoNome });
  }

  atualizarDescricao(novaDescricao: string | null): void {
    Object.assign(this.props, { descricao: novaDescricao });
  }

  atualizarPrecoBundle(novoPreco: Dinheiro): void {
    Object.assign(this.props, { precoBundle: novoPreco });
  }

  static criar(props: Omit<ComboProps, 'id'>): Combo {
    return new Combo({ ...props, id: crypto.randomUUID() } as ComboProps);
  }

  static reconstruir(props: ComboProps): Combo {
    return new Combo(props);
  }
}
