import { EntityClass } from '@/domain/shared';
import { ModificadorValor } from './ModificadorValor';

export interface ModificadorGrupoProps {
  id: string;
  restauranteId: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
  valores: ModificadorValor[];
  ativo: boolean;
}

export class ModificadorGrupo extends EntityClass<ModificadorGrupoProps> {
  get restauranteId(): string {
    return this.props.restauranteId;
  }

  get nome(): string {
    return this.props.nome;
  }

  get obrigatorio(): boolean {
    return this.props.obrigatorio;
  }

  get minSelecoes(): number {
    return this.props.minSelecoes;
  }

  get maxSelecoes(): number {
    return this.props.maxSelecoes;
  }

  get valores(): ModificadorValor[] {
    return [...this.props.valores];
  }

  get valoresAtivos(): ModificadorValor[] {
    return this.props.valores.filter(v => v.ativo);
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  equals(other: EntityClass<ModificadorGrupoProps>): boolean {
    if (!(other instanceof ModificadorGrupo)) return false;
    return this.id === other.id;
  }

  temValor(valorId: string): boolean {
    return this.props.valores.some(v => v.id === valorId);
  }

  getValor(valorId: string): ModificadorValor | undefined {
    return this.props.valores.find(v => v.id === valorId);
  }

  adicionarValor(valor: ModificadorValor): void {
    if (valor.modificadorGrupoId !== this.id) {
      throw new Error('Valor não pertence a este grupo de modificador');
    }
    this.props.valores.push(valor);
  }

  removerValor(valorId: string): void {
    const index = this.props.valores.findIndex(v => v.id === valorId);
    if (index === -1) {
      throw new Error(`Valor ${valorId} não encontrado no grupo`);
    }
    this.props.valores.splice(index, 1);
  }

  atualizarNome(novoNome: string): void {
    Object.assign(this.props, { nome: novoNome });
  }

  atualizarObrigatoriedade(obrigatorio: boolean): void {
    Object.assign(this.props, { obrigatorio });
  }

  atualizarSelecoes(min: number, max: number): void {
    if (min < 0 || max < min) {
      throw new Error('Configuração de seleção inválida');
    }
    Object.assign(this.props, { minSelecoes: min, maxSelecoes: max });
  }

  desativar(): void {
    Object.assign(this.props, { ativo: false });
  }

  static criar(props: Omit<ModificadorGrupoProps, 'id'>): ModificadorGrupo {
    return new ModificadorGrupo({ ...props, id: crypto.randomUUID() } as ModificadorGrupoProps);
  }

  static reconstruir(props: ModificadorGrupoProps): ModificadorGrupo {
    return new ModificadorGrupo(props);
  }
}
