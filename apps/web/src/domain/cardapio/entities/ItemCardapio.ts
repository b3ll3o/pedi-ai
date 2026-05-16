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
  criadoEm: Date;
  atualizadoEm: Date;
  deletedAt: Date | null;
  version: number;
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

  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get version(): number {
    return this.props.version;
  }

  /**
   * Verifica se o item foi excluído (soft delete).
   */
  get estaDeletado(): boolean {
    return this.props.deletedAt !== null;
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
    return this.props.labelsDieteticos.some((l) => l.toString() === label);
  }

  ativar(): void {
    Object.assign(this.props, {
      ativo: true,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  desativar(): void {
    Object.assign(this.props, {
      ativo: false,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  atualizarPreco(novoPreco: Dinheiro): void {
    Object.assign(this.props, {
      preco: novoPreco,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  atualizarNome(novoNome: string): void {
    Object.assign(this.props, {
      nome: novoNome,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  atualizarDescricao(novaDescricao: string | null): void {
    Object.assign(this.props, {
      descricao: novaDescricao,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  atualizarImagem(novaImagemUrl: string | null): void {
    Object.assign(this.props, {
      imagemUrl: novaImagemUrl,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  atualizarTipo(novoTipo: TipoItemCardapio): void {
    Object.assign(this.props, {
      tipo: novoTipo,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  atualizarLabels(novosLabels: LabelDietetico[]): void {
    Object.assign(this.props, {
      labelsDieteticos: [...novosLabels],
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Soft delete: marca o item como excluído sem remover do banco.
   */
  marcarDeletado(): void {
    Object.assign(this.props, {
      deletedAt: new Date(),
      ativo: false,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Restaurar um item previamente deletado (soft undelete).
   */
  restaurar(): void {
    Object.assign(this.props, {
      deletedAt: null,
      ativo: true,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  static criar(
    props: Omit<ItemCardapioProps, 'id' | 'criadoEm' | 'atualizadoEm' | 'deletedAt' | 'version'>
  ): ItemCardapio {
    const now = new Date();
    return new ItemCardapio({
      ...props,
      id: crypto.randomUUID(),
      criadoEm: now,
      atualizadoEm: now,
      deletedAt: null,
      version: 1,
    } as ItemCardapioProps);
  }

  static reconstruir(props: ItemCardapioProps): ItemCardapio {
    return new ItemCardapio(props);
  }
}
