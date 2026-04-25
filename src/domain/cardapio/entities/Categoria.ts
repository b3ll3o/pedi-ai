import { EntityClass } from '@/domain/shared';

export interface CategoriaProps {
  id: string;
  restauranteId: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  ordemExibicao: number;
  ativo: boolean;
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

  equals(other: EntityClass<CategoriaProps>): boolean {
    if (!(other instanceof Categoria)) return false;
    return this.id === other.id;
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

  atualizarOrdem(novaOrdem: number): void {
    Object.assign(this.props, { ordemExibicao: novaOrdem });
  }

  static criar(props: Omit<CategoriaProps, 'id'>): Categoria {
    return new Categoria({ ...props, id: crypto.randomUUID() } as CategoriaProps);
  }

  static reconstruir(props: CategoriaProps): Categoria {
    return new Categoria(props);
  }
}
