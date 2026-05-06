import { EntityClass } from '@/domain/shared';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '../value-objects/TipoItemCardapio';
import { LabelDietetico, LabelDieteticoValue } from '../value-objects/LabelDietetico';

export interface ItemCardapioProps {
  id: string;
  categoriaId: string;
  restauranteId?: string;
  nome: string;
  descricao: string | null;
  preco: Dinheiro;
  imagemUrl: string | null;
  tipo: TipoItemCardapio;
  labelsDieteticos: LabelDietetico[];
  ativo: boolean;
}

export class ItemCardapio extends EntityClass<ItemCardapioProps> {
  get categoriaId(): string {
    return this.props.categoriaId;
  }

  get nome(): string {
    return this.props.nome;
  }

  get descricao(): string | null {
    return this.props.descricao;
  }

  get preco(): Dinheiro {
    return this.props.preco;
  }

  get imagemUrl(): string | null {
    return this.props.imagemUrl;
  }

  get tipo(): TipoItemCardapio {
    return this.props.tipo;
  }

  get labelsDieteticos(): LabelDietetico[] {
    return [...this.props.labelsDieteticos];
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get restauranteId(): string | undefined {
    return this.props.restauranteId;
  }

  equals(other: EntityClass<ItemCardapioProps>): boolean {
    if (!(other instanceof ItemCardapio)) return false;
    return this.id === other.id;
  }

  isProduto(): boolean {
    return this.props.tipo.isProduto();
  }

  isCombo(): boolean {
    return this.props.tipo.isCombo();
  }

  temLabel(label: LabelDieteticoValue): boolean {
    return this.props.labelsDieteticos.some(l => l.toString() === label);
  }

  ativar(): void {
    Object.assign(this.props, { ativo: true });
  }

  desativar(): void {
    Object.assign(this.props, { ativo: false });
  }

  atualizarPreco(novoPreco: Dinheiro): void {
    Object.assign(this.props, { preco: novoPreco });
  }

  atualizarNome(novoNome: string): void {
    Object.assign(this.props, { nome: novoNome });
  }

  atualizarDescricao(novaDescricao: string | null): void {
    Object.assign(this.props, { descricao: novaDescricao });
  }

  atualizarImagem(novaImagemUrl: string | null): void {
    Object.assign(this.props, { imagemUrl: novaImagemUrl });
  }

  atualizarTipo(novoTipo: TipoItemCardapio): void {
    Object.assign(this.props, { tipo: novoTipo });
  }

  atualizarLabels(novosLabels: LabelDietetico[]): void {
    Object.assign(this.props, { labelsDieteticos: [...novosLabels] });
  }

  static criar(props: Omit<ItemCardapioProps, 'id'>): ItemCardapio {
    return new ItemCardapio({ ...props, id: crypto.randomUUID() } as ItemCardapioProps);
  }

  static reconstruir(props: ItemCardapioProps): ItemCardapio {
    return new ItemCardapio(props);
  }
}
