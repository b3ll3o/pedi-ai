/**
 * @spec(RF-ADM-FF-03, RF-ADM-FF-04)
 *
 * Value Object `FlagValue` — wrapper tipado para valores de feature flag.
 * Suporta 4 tipos: BOOLEAN, STRING, NUMBER, JSON.
 *
 * Invariante: o tipo do valor deve ser compatível com o `valueType` declarado.
 */

export type FlagValueType = 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';

const TYPE_NAMES: Record<FlagValueType, string> = {
  BOOLEAN: 'BOOLEAN',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  JSON: 'JSON',
};

function isPlainObject(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export class FlagValue {
  private constructor(
    public readonly tipo: FlagValueType,
    public readonly valor: unknown
  ) {}

  static criar(tipo: string, valor: unknown): FlagValue {
    if (!Object.prototype.hasOwnProperty.call(TYPE_NAMES, tipo)) {
      throw new Error(`FlagValue: valueType desconhecido '${tipo}'`);
    }

    const t = tipo as FlagValueType;

    switch (t) {
      case 'BOOLEAN':
        if (typeof valor !== 'boolean') {
          throw new Error(
            `FlagValue: tipo incompatível — esperado BOOLEAN (boolean nativo), recebido ${typeof valor}`
          );
        }
        break;

      case 'STRING':
        if (typeof valor !== 'string') {
          throw new Error(
            `FlagValue: tipo incompatível — esperado STRING, recebido ${typeof valor}`
          );
        }
        break;

      case 'NUMBER':
        if (typeof valor !== 'number' || !Number.isFinite(valor)) {
          throw new Error(
            `FlagValue: tipo incompatível — esperado NUMBER (finito), recebido ${typeof valor}`
          );
        }
        break;

      case 'JSON':
        if (typeof valor !== 'object' || valor === null) {
          throw new Error(
            `FlagValue: tipo incompatível — esperado JSON (objeto ou array), recebido ${typeof valor}`
          );
        }
        if (Array.isArray(valor)) {
          // arrays são JSON válidos
          break;
        }
        if (!isPlainObject(valor)) {
          throw new Error(`FlagValue: JSON deve ser objeto plain ou array`);
        }
        break;
    }

    return new FlagValue(t, valor);
  }
}
