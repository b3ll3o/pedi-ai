/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-08)
 *
 * Value Object `RolloutPercentage` — inteiro 0..100 representando a
 * porcentagem de rollout determinístico para um override.
 *
 * Restrições:
 *   - Inteiro finito no intervalo fechado [0, 100]
 *   - 0 ⇒ override nunca aplica
 *   - 100 ⇒ override sempre aplica
 *   - 1..99 ⇒ hash determinístico decide
 */
export class RolloutPercentage {
  private constructor(public readonly valor: number) {}

  static criar(input: unknown): RolloutPercentage {
    if (typeof input !== 'number') {
      throw new Error('RolloutPercentage: tipo deve ser number');
    }

    if (!Number.isFinite(input)) {
      throw new Error(
        `RolloutPercentage: valor deve estar entre 0 a 100 (recebido ${input} — não finito)`
      );
    }

    if (!Number.isInteger(input)) {
      throw new Error('RolloutPercentage: valor deve ser inteiro (não decimal)');
    }

    if (input < 0 || input > 100) {
      throw new Error(`RolloutPercentage: valor deve estar entre 0 a 100 (recebido ${input})`);
    }

    return new RolloutPercentage(input);
  }

  isFull(): boolean {
    return this.valor === 100;
  }

  isZero(): boolean {
    return this.valor === 0;
  }

  equals(other: RolloutPercentage): boolean {
    return other instanceof RolloutPercentage && other.valor === this.valor;
  }
}
