import { EntityClass } from '@/domain/shared';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';

export interface ModificadorValorProps {
  id: string;
  modificadorGrupoId: string;
  nome: string;
  ajustePreco: Dinheiro;
  ativo: boolean;
}

export class ModificadorValor extends EntityClass<ModificadorValorProps> {
  get modificadorGrupoId(): string {
    return this.props.modificadorGrupoId;
  }

  get nome(): string {
    return this.props.nome;
  }

  get ajustePreco(): Dinheiro {
    return this.props.ajustePreco;
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  equals(other: EntityClass<ModificadorValorProps>): boolean {
    if (!(other instanceof ModificadorValor)) return false;
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

  atualizarAjustePreco(novoAjuste: Dinheiro): void {
    Object.assign(this.props, { ajustePreco: novoAjuste });
  }

  static criar(props: Omit<ModificadorValorProps, 'id'>): ModificadorValor {
    return new ModificadorValor({ ...props, id: crypto.randomUUID() } as ModificadorValorProps);
  }

  static reconstruir(props: ModificadorValorProps): ModificadorValor {
    return new ModificadorValor(props);
  }
}
