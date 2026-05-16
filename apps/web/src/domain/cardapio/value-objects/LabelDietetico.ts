import { ValueObjectClass } from '@/domain/shared';

export type LabelDieteticoValue =
  | 'vegetariano'
  | 'vegano'
  | 'glutenFree'
  | 'sugarFree'
  | 'dairyFree'
  | 'organic'
  | 'spicy'
  | 'lowCarb';

export class LabelDietetico extends ValueObjectClass<LabelDieteticoValue> {
  static readonly VEGETARIANO = new LabelDietetico('vegetariano');
  static readonly VEGANO = new LabelDietetico('vegano');
  static readonly GLUTEN_FREE = new LabelDietetico('glutenFree');
  static readonly SUGAR_FREE = new LabelDietetico('sugarFree');
  static readonly DAIRY_FREE = new LabelDietetico('dairyFree');
  static readonly ORGANIC = new LabelDietetico('organic');
  static readonly SPICY = new LabelDietetico('spicy');
  static readonly LOW_CARB = new LabelDietetico('lowCarb');

  private constructor(value: LabelDieteticoValue) {
    super(value);
  }

  static fromValue(value: string): LabelDietetico {
    const label = ALL_LABELS.find((l) => l.props === value);
    if (!label) {
      throw new Error(`LabelDietetico inválido: ${value}`);
    }
    return label;
  }

  static fromArray(values: string[]): LabelDietetico[] {
    return values.map((v) => LabelDietetico.fromValue(v));
  }

  equals(other: ValueObjectClass<LabelDieteticoValue>): boolean {
    if (!(other instanceof LabelDietetico)) return false;
    return this.props === other.props;
  }

  toString(): string {
    return this.props;
  }
}

const ALL_LABELS: LabelDietetico[] = [
  LabelDietetico.VEGETARIANO,
  LabelDietetico.VEGANO,
  LabelDietetico.GLUTEN_FREE,
  LabelDietetico.SUGAR_FREE,
  LabelDietetico.DAIRY_FREE,
  LabelDietetico.ORGANIC,
  LabelDietetico.SPICY,
  LabelDietetico.LOW_CARB,
];
