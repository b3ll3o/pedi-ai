import { EntityClass } from '@/domain/shared';

export interface UsuarioRestauranteProps {
  id: string;
  usuarioId: string;
  restauranteId: string;
  papel: 'dono' | 'gerente' | 'atendente';
  criadoEm: Date;
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

  eDono(): boolean {
    return this.props.papel === 'dono';
  }

  eGerente(): boolean {
    return this.props.papel === 'gerente';
  }

  eFuncionario(): boolean {
    return this.props.papel === 'atendente';
  }

  static criar(props: Omit<UsuarioRestauranteProps, 'id' | 'criadoEm'>): UsuarioRestaurante {
    return new UsuarioRestaurante({
      ...props,
      id: crypto.randomUUID(),
      criadoEm: new Date(),
    });
  }

  static reconstruir(props: UsuarioRestauranteProps): UsuarioRestaurante {
    return new UsuarioRestaurante(props);
  }
}
