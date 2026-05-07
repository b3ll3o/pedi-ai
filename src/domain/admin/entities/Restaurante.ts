import { EntityClass } from '@/domain/shared';
import { IUsuarioRestauranteRepository } from '../repositories/IUsuarioRestauranteRepository';

export interface RestauranteProps {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string | null;
  logoUrl: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  deletedAt: Date | null;
  version: number;
}

export class Restaurante extends EntityClass<RestauranteProps> {
  get nome(): string {
    return this.props.nome;
  }

  get cnpj(): string {
    return this.props.cnpj;
  }

  get endereco(): string {
    return this.props.endereco;
  }

  get telefone(): string | null {
    return this.props.telefone;
  }

  get logoUrl(): string | null {
    return this.props.logoUrl;
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
   * Verifica se o restaurante foi excluído (soft delete).
   */
  get estaDeletado(): boolean {
    return this.props.deletedAt !== null;
  }

  equals(other: EntityClass<RestauranteProps>): boolean {
    if (!(other instanceof Restaurante)) return false;
    return this.id === other.id;
  }

  atualizarNome(novoNome: string): void {
    Object.assign(this.props, { nome: novoNome, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  atualizarEndereco(novoEndereco: string): void {
    Object.assign(this.props, { endereco: novoEndereco, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  atualizarTelefone(novoTelefone: string | null): void {
    Object.assign(this.props, { telefone: novoTelefone, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  atualizarLogo(novaLogoUrl: string | null): void {
    Object.assign(this.props, { logoUrl: novaLogoUrl, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  ativar(): void {
    Object.assign(this.props, { ativo: true, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  desativar(): void {
    Object.assign(this.props, { ativo: false, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  /**
   * Soft delete: marca o restaurante como excluído sem remover do banco.
   */
  marcarDeletado(): void {
    Object.assign(this.props, { deletedAt: new Date(), ativo: false, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  /**
   * Restaurar um restaurante previamente deletado (soft undelete).
   */
  restaurar(): void {
    Object.assign(this.props, { deletedAt: null, ativo: true, atualizadoEm: new Date(), version: this.props.version + 1 });
  }

  static criar(props: Omit<RestauranteProps, 'id' | 'criadoEm' | 'atualizadoEm' | 'deletedAt' | 'version'>): Restaurante {
    const now = new Date();
    return new Restaurante({
      ...props,
      id: crypto.randomUUID(),
      criadoEm: now,
      atualizadoEm: now,
      deletedAt: null,
      version: 1,
    } as RestauranteProps);
  }

  static reconstruir(props: RestauranteProps): Restaurante {
    return new Restaurante(props);
  }

  /**
   * Verifica se o usuário tem acesso a este restaurante através da relação
   * UsuarioRestaurante (N:N).
   * @param usuarioId ID do usuário
   * @param repository Repositório de UsuarioRestaurante
   * @returns true se o usuário está vinculado ao restaurante
   */
  async pertenceAoUsuario(
    usuarioId: string,
    repository: IUsuarioRestauranteRepository
  ): Promise<boolean> {
    const vinculo = await repository.findByUsuarioIdAndRestauranteId(
      usuarioId,
      this.id
    );
    return vinculo !== null;
  }
}
