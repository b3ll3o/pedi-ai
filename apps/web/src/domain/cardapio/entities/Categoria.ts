import { EntityClass } from '@/domain/shared';

export interface CategoriaProps {
  id: string;
  restauranteId: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  ordemExibicao: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  deletedAt: Date | null;
  version: number;
}

export class Categoria extends EntityClass<CategoriaProps> {
  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get nome(): string {
    return this.props.nome;
  }

  get descricao(): string | null {
    return this.props.descricao;
  }

  get imagemUrl(): string | null {
    return this.props.imagemUrl;
  }

  get ordemExibicao(): number {
    return this.props.ordemExibicao;
  }

  get ativo(): boolean {
    return this.props.ativo;
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
   * Verifica se a categoria foi excluída (soft delete).
   */
  get estaDeletada(): boolean {
    return this.props.deletedAt !== null;
  }

  equals(other: EntityClass<CategoriaProps>): boolean {
    if (!(other instanceof Categoria)) return false;
    return this.id === other.id;
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

  atualizarOrdem(novaOrdem: number): void {
    Object.assign(this.props, {
      ordemExibicao: novaOrdem,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Soft delete: marca a categoria como excluída sem remover do banco.
   */
  marcarDeletada(): void {
    Object.assign(this.props, {
      deletedAt: new Date(),
      ativo: false,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Restaurar uma categoria previamente deletada (soft undelete).
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
    props: Omit<CategoriaProps, 'id' | 'criadoEm' | 'atualizadoEm' | 'deletedAt' | 'version'>
  ): Categoria {
    const now = new Date();
    return new Categoria({
      ...props,
      id: crypto.randomUUID(),
      criadoEm: now,
      atualizadoEm: now,
      deletedAt: null,
      version: 1,
    } as CategoriaProps);
  }

  static reconstruir(props: CategoriaProps): Categoria {
    return new Categoria(props);
  }
}
