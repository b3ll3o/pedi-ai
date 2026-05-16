import { Usuario, UsuarioProps } from '../entities/Usuario';
import { Papel } from '../value-objects/Papel';
import { EventDispatcher } from '@/domain/shared';
import { UsuarioCriadoEvent } from '../events/UsuarioCriadoEvent';

export class UsuarioAggregate {
  private usuario: Usuario;
  private eventDispatcher: EventDispatcher;

  constructor(usuario: Usuario, eventDispatcher?: EventDispatcher) {
    this.usuario = usuario;
    this.eventDispatcher = eventDispatcher ?? EventDispatcher.getInstance();
  }

  get id(): string {
    return this.usuario.id;
  }

  get email(): string {
    return this.usuario.email;
  }

  get papel(): Papel {
    return this.usuario.papel;
  }

  get restauranteId(): string | undefined {
    return this.usuario.restauranteId;
  }

  get usuarioEntity(): Usuario {
    return this.usuario;
  }

  podeAcessarRecurso(restauranteId: string): boolean {
    return this.usuario.podeAcessarRestaurante(restauranteId);
  }

  eProprietario(): boolean {
    return this.usuario.eProprietario();
  }

  eGerente(): boolean {
    return this.usuario.eGerente();
  }

  eFuncionario(): boolean {
    return this.usuario.eFuncionario();
  }

  eCliente(): boolean {
    return this.usuario.eCliente();
  }

  static criar(props: Omit<UsuarioProps, 'createdAt' | 'updatedAt'>): UsuarioAggregate {
    const usuario = Usuario.criar(props);
    const aggregate = new UsuarioAggregate(usuario);

    const event = new UsuarioCriadoEvent(usuario);
    aggregate.eventDispatcher.dispatch(event);

    return aggregate;
  }

  static reconstruir(props: UsuarioProps): UsuarioAggregate {
    const usuario = Usuario.reconstruir(props);
    return new UsuarioAggregate(usuario);
  }
}
