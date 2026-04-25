import { EntityClass } from '@/domain/shared';

export interface SessaoProps {
  id: string;
  usuarioId: string;
  token: string;
  expiracao: Date;
  dispositivo: string;
}

export class Sessao extends EntityClass<SessaoProps> {
  get usuarioId(): string {
    return this.props.usuarioId;
  }

  get token(): string {
    return this.props.token;
  }

  get expiracao(): Date {
    return this.props.expiracao;
  }

  get dispositivo(): string {
    return this.props.dispositivo;
  }

  get estaExpirada(): boolean {
    return new Date() > this.props.expiracao;
  }

  equals(other: EntityClass<SessaoProps>): boolean {
    if (!(other instanceof Sessao)) return false;
    return this.id === other.id;
  }

  static criar(props: Omit<SessaoProps, 'id'> & { id?: string }): Sessao {
    return new Sessao({
      ...props,
      id: props.id ?? crypto.randomUUID(),
    });
  }

  static reconstruir(props: SessaoProps): Sessao {
    return new Sessao(props);
  }
}
