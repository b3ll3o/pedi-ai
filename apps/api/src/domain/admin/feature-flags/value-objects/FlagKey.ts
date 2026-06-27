/**
 * @spec(RF-ADM-FF-03)
 *
 * Value Object `FlagKey` — chave canônica snake_case de uma feature flag.
 *
 * Restrições (vide `design.md §5`):
 *   - Regex: `^[a-z0-9_]{3,64}$`
 *   - Comprimento mínimo 3, máximo 64
 *   - Apenas letras minúsculas, dígitos e underscore
 *   - Imutável (VO puro)
 *   - Igualdade por valor
 */
export class FlagKey {
  private static readonly REGEX = /^[a-z0-9_]+$/;
  private static readonly MIN_LEN = 3;
  private static readonly MAX_LEN = 64;

  private constructor(public readonly valor: string) {}

  static criar(input: string): FlagKey {
    if (typeof input !== 'string') {
      throw new Error('FlagKey inválida: deve ser string');
    }

    if (input.length === 0) {
      throw new Error('FlagKey inválida: key vazia');
    }

    if (input.length < FlagKey.MIN_LEN || input.length > FlagKey.MAX_LEN) {
      throw new Error(
        `FlagKey inválida: key deve ter entre 3 a 64 caracteres (mínimo 3, recebido: ${input.length})`
      );
    }

    if (!FlagKey.REGEX.test(input)) {
      throw new Error(
        'FlagKey inválida: key deve estar em snake_case (apenas letras minúsculas, dígitos e underscore)'
      );
    }

    return new FlagKey(input);
  }

  /**
   * Igualdade por valor (VO é comparado por conteúdo, não referência).
   */
  equals(other: FlagKey): boolean {
    return other instanceof FlagKey && other.valor === this.valor;
  }

  toString(): string {
    return this.valor;
  }
}
