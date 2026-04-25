import { ValueObjectClass } from '@/domain/shared';

export interface ModificadorSelecionadoProps {
  grupoId: string;
  grupoNome: string;
  modificadorId: string;
  modificadorNome: string;
  precoAdicional: number; // em centavos
}

export class ModificadorSelecionado extends ValueObjectClass<ModificadorSelecionadoProps> {
  get grupoId(): string {
    return this.props.grupoId;
  }

  get grupoNome(): string {
    return this.props.grupoNome;
  }

  get modificadorId(): string {
    return this.props.modificadorId;
  }

  get modificadorNome(): string {
    return this.props.modificadorNome;
  }

  get precoAdicional(): number {
    return this.props.precoAdicional;
  }

  equals(other: ValueObjectClass<ModificadorSelecionadoProps>): boolean {
    if (!(other instanceof ModificadorSelecionado)) return false;
    return this.props.modificadorId === other.props.modificadorId;
  }
}
