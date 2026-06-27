/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-08)
 *
 * Value Object `TargetingRule` — combinação de `scope` + `scopeId`.
 *
 * Regras (vide `design.md §5`):
 *   - scope = GLOBAL  ⇒ scopeId DEVE ser null
 *   - scope = RESTAURANT | USER ⇒ scopeId obrigatório (string não-vazia)
 *   - scope fora do enum ⇒ erro
 */
export type FlagScopeType = 'GLOBAL' | 'RESTAURANT' | 'USER';

const VALID_SCOPES: ReadonlyArray<FlagScopeType> = ['GLOBAL', 'RESTAURANT', 'USER'];

export class TargetingRule {
  private constructor(
    public readonly scope: FlagScopeType,
    public readonly scopeId: string | null
  ) {}

  static criar(input: { scope: string; scopeId: string | null }): TargetingRule {
    if (!VALID_SCOPES.includes(input.scope as FlagScopeType)) {
      throw new Error(
        `TargetingRule: scope inválido '${input.scope}' (esperado: GLOBAL, RESTAURANT, USER)`
      );
    }

    const scope = input.scope as FlagScopeType;
    const scopeId = input.scopeId;

    if (scope === 'GLOBAL') {
      if (scopeId !== null && scopeId !== undefined) {
        throw new Error('TargetingRule: scopeId deve ser nulo quando scope = GLOBAL');
      }
      return new TargetingRule('GLOBAL', null);
    }

    // RESTAURANT | USER → scopeId obrigatório
    if (scopeId === null || scopeId === undefined || scopeId === '') {
      throw new Error(`TargetingRule: scopeId é obrigatório quando scope = ${scope}`);
    }

    if (typeof scopeId !== 'string') {
      throw new Error('TargetingRule: scopeId deve ser string não-vazia');
    }

    return new TargetingRule(scope, scopeId);
  }

  equals(other: TargetingRule): boolean {
    return (
      other instanceof TargetingRule && other.scope === this.scope && other.scopeId === this.scopeId
    );
  }
}
