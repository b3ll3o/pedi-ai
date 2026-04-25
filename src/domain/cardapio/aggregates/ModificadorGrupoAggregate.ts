import { ModificadorGrupo, ModificadorGrupoProps } from '../entities/ModificadorGrupo';
import { ModificadorValor } from '../entities/ModificadorValor';

export class ModificadorGrupoAggregate {
  private grupo: ModificadorGrupo;

  constructor(grupo: ModificadorGrupo) {
    this.grupo = grupo;
    this.validarInvariantes();
  }

  get id(): string {
    return this.grupo.id;
  }

  get grupoEntity(): ModificadorGrupo {
    return this.grupo;
  }

  get nome(): string {
    return this.grupo.nome;
  }

  get obrigatorio(): boolean {
    return this.grupo.obrigatorio;
  }

  get minSelecoes(): number {
    return this.grupo.minSelecoes;
  }

  get maxSelecoes(): number {
    return this.grupo.maxSelecoes;
  }

  get valores(): ModificadorValor[] {
    return this.grupo.valores;
  }

  private validarInvariantes(): void {
    // Invariante: minSelecoes não pode ser maior que maxSelecoes
    if (this.grupo.minSelecoes > this.grupo.maxSelecoes) {
      throw new Error('minSelecoes não pode ser maior que maxSelecoes');
    }

    // Invariante: minSelecoes não pode ser negativo
    if (this.grupo.minSelecoes < 0) {
      throw new Error('minSelecoes não pode ser negativo');
    }

    // Invariante: se obrigatorio, minSelecoes deve ser pelo menos 1
    if (this.grupo.obrigatorio && this.grupo.minSelecoes < 1) {
      throw new Error('Grupo obrigatorio deve ter minSelecoes >= 1');
    }

    // Invariante: maxSelecoes não pode ser maior que a quantidade de valores ativos
    const quantidadeValoresAtivos = this.grupo.valoresAtivos.length;
    if (this.grupo.maxSelecoes > quantidadeValoresAtivos) {
      throw new Error('maxSelecoes não pode exceder a quantidade de valores ativos');
    }
  }

  validarSelecao(selecionados: string[]): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    // Verificar se todos os selecionados existem no grupo
    for (const valorId of selecionados) {
      if (!this.grupo.temValor(valorId)) {
        erros.push(`Valor ${valorId} não existe neste grupo`);
      } else {
        const valor = this.grupo.getValor(valorId);
        if (valor && !valor.ativo) {
          erros.push(`Valor ${valor.nome} não está ativo`);
        }
      }
    }

    // Verificar quantidade mínima
    if (selecionados.length < this.grupo.minSelecoes) {
      erros.push(`Deve selecionar pelo menos ${this.grupo.minSelecoes} opção(ões)`);
    }

    // Verificar quantidade máxima
    if (selecionados.length > this.grupo.maxSelecoes) {
      erros.push(`Deve selecionar no máximo ${this.grupo.maxSelecoes} opção(ões)`);
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }

  adicionarValor(valor: ModificadorValor): void {
    this.grupo.adicionarValor(valor);
    this.validarInvariantes();
  }

  removerValor(valorId: string): void {
    this.grupo.removerValor(valorId);
    this.validarInvariantes();
  }

  static criar(props: Omit<ModificadorGrupoProps, 'id'>): ModificadorGrupoAggregate {
    const grupo = ModificadorGrupo.criar(props);
    return new ModificadorGrupoAggregate(grupo);
  }

  static reconstruir(props: ModificadorGrupoProps): ModificadorGrupoAggregate {
    const grupo = ModificadorGrupo.reconstruir(props);
    return new ModificadorGrupoAggregate(grupo);
  }
}
