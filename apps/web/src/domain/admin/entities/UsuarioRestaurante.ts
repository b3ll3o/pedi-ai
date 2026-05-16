import { EntityClass } from '@/domain/shared';

export interface UsuarioRestauranteProps {
  id: string;
  usuarioId: string;
  restauranteId: string;
  papel: 'dono' | 'gerente' | 'atendente';
  criadoEm: Date;
  atualizadoEm: Date;
  deletedAt: Date | null;
  version: number;
}

export class UsuarioRestaurante extends EntityClass<UsuarioRestauranteProps> {
  get usuarioId(): string {
    return this.props.usuarioId;
  }

  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get papel(): 'dono' | 'gerente' | 'atendente' {
    return this.props.papel;
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
   * Verifica se o vínculo foi excluído (soft delete).
   */
  get estaDeletado(): boolean {
    return this.props.deletedAt !== null;
  }

  eDono(): boolean {
    return this.props.papel === 'dono';
  }

  eGerente(): boolean {
    return this.props.papel === 'gerente';
  }

  eFuncionario(): boolean {
    return this.props.papel === 'atendente';
  }

  /**
   * Atualiza o papel do usuário no restaurante.
   */
  atualizarPapel(novoPapel: 'dono' | 'gerente' | 'atendente'): void {
    Object.assign(this.props, {
      papel: novoPapel,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Soft delete: marca o vínculo como excluído sem remover do banco.
   */
  marcarDeletado(): void {
    Object.assign(this.props, {
      deletedAt: new Date(),
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  /**
   * Restaurar um vínculo previamente deletado (soft undelete).
   */
  restaurar(): void {
    Object.assign(this.props, {
      deletedAt: null,
      atualizadoEm: new Date(),
      version: this.props.version + 1,
    });
  }

  static criar(
    props: Omit<
      UsuarioRestauranteProps,
      'id' | 'criadoEm' | 'atualizadoEm' | 'deletedAt' | 'version'
    >
  ): UsuarioRestaurante {
    const now = new Date();
    return new UsuarioRestaurante({
      ...props,
      id: crypto.randomUUID(),
      criadoEm: now,
      atualizadoEm: now,
      deletedAt: null,
      version: 1,
    } as UsuarioRestauranteProps);
  }

  static reconstruir(props: UsuarioRestauranteProps): UsuarioRestaurante {
    return new UsuarioRestaurante(props);
  }
}
