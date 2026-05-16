import { AggregateRootClass } from '@/domain/shared';
import { Papel } from '../value-objects/Papel';

export interface UsuarioProps {
  id: string;
  email: string;
  papel: Papel;
  /**
   * @deprecated Utilize a relação N:N via UsuarioRestaurante para múltiplos restaurantes.
   * O campo restauranteId será removido em versões futuras.
   */
  restauranteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Usuario extends AggregateRootClass<UsuarioProps> {
  get email(): string {
    return this.props.email;
  }

  get papel(): Papel {
    return this.props.papel;
  }

  get restauranteId(): string | undefined {
    return this.props.restauranteId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Alias em português para createdAt */
  get criadoEm(): Date {
    return this.props.createdAt;
  }

  /** Alias em português para updatedAt */
  get atualizadoEm(): Date {
    return this.props.updatedAt;
  }

  equals(other: AggregateRootClass<UsuarioProps>): boolean {
    if (!(other instanceof Usuario)) return false;
    return this.id === other.id;
  }

  eProprietario(): boolean {
    return Papel.isDono(this.papel);
  }

  eGerente(): boolean {
    return Papel.isGerente(this.papel);
  }

  eFuncionario(): boolean {
    return Papel.isAtendente(this.papel);
  }

  eCliente(): boolean {
    return Papel.isCliente(this.papel);
  }

  podeAcessarRestaurante(restauranteId: string): boolean {
    if (this.eCliente()) return false;
    if (this.eProprietario()) return true;
    return this.props.restauranteId === restauranteId;
  }

  static criar(props: Omit<UsuarioProps, 'createdAt' | 'updatedAt'>): Usuario {
    const now = new Date();
    return new Usuario({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruir(props: UsuarioProps): Usuario {
    return new Usuario(props);
  }
}
