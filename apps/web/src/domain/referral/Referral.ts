/**
 * Referral — Entidade de Domínio
 *
 * **Conceito:**
 * - Dono de restaurante A compartilha link de indicação
 * - Dono de restaurante B se cadastra usando o link
 * - Quando B paga a primeira mensalidade:
 *   - **B ganha 1 mês grátis** (desconto aplicado na fatura)
 *   - **A ganha 1 mês grátis** (reward credit na assinatura)
 *
 * **Regras:**
 * - Código de referral único por restaurante (8 caracteres, alfanumérico)
 * - Auto-referral bloqueado (não pode indicar a si mesmo)
 * - Reward só é creditado APÓS primeiro pagamento confirmado
 * - Limite de 100 indicados pagos por restaurante (anti-abuse)
 * - Cookies de referral expiram em 30 dias
 *
 * @see apps/web/src/domain/referral/
 */

export type ReferralStatus = 'pending' | 'converted' | 'expired' | 'cancelled';

export interface ReferralProps {
  id: string;
  /** Restaurante que indicou (referrer) */
  referrerRestaurantId: string;
  /** Código de referral compartilhado (único) */
  code: string;
  /** Total de pessoas que se cadastraram usando o código */
  totalSignups: number;
  /** Total que efetivamente assinaram (pagaram) */
  totalConversions: number;
  /** Reward credit disponível (em meses grátis) */
  rewardCreditMonths: number;
  /** Reward credit JÁ aplicado (em meses) */
  rewardCreditAppliedMonths: number;
  /** Status do programa de referral do restaurante */
  status: ReferralStatus;
  /** Quando o código foi criado */
  createdAt: Date;
  /** Última atualização */
  updatedAt: Date;
  /** Versão (otimistic locking) */
  version: number;
}

export interface ReferralConversion {
  id: string;
  referralId: string;
  /** Restaurante que foi indicado (referred) */
  referredRestaurantId: string;
  /** Status da conversão */
  status: 'pending' | 'rewarded' | 'cancelled';
  /** Quando o referred assinou (pagou) pela primeira vez */
  convertedAt: Date | null;
  /** Quando o reward foi aplicado */
  rewardedAt: Date | null;
  /** Quantos meses de reward foram creditados */
  rewardMonths: number;
  createdAt: Date;
}

/**
 * Calcula meses de reward baseado no número de conversões.
 *
 * Tabela de reward (gamificação simples):
 * - 0-2 conversões: 0 meses extras
 * - 3-5 conversões: 1 mês extra
 * - 6-10: 2 meses extras
 * - 11+: 3 meses extras (cap)
 */
export function calculateRewardTier(conversions: number): number {
  if (conversions >= 11) return 3;
  if (conversions >= 6) return 2;
  if (conversions >= 3) return 1;
  return 0;
}

export class Referral {
  private props: ReferralProps;

  constructor(props: ReferralProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get code(): string {
    return this.props.code;
  }

  get referrerRestaurantId(): string {
    return this.props.referrerRestaurantId;
  }

  get totalSignups(): number {
    return this.props.totalSignups;
  }

  get totalConversions(): number {
    return this.props.totalConversions;
  }

  get rewardCreditMonths(): number {
    return this.props.rewardCreditMonths;
  }

  get availableCreditMonths(): number {
    return this.props.rewardCreditMonths - this.props.rewardCreditAppliedMonths;
  }

  /**
   * URL de compartilhamento do código de referral. Recebe a base URL
   * porque o domínio é configurável por ambiente (dev/staging/prod).
   * Antes era `get shareUrl(baseUrl)` — inválido (getter TS não aceita
   * parâmetros). É método normal agora; callers passam a base URL.
   */
  shareUrl(baseUrl: string): string {
    return `${baseUrl}/register?ref=${this.props.code}`;
  }

  /**
   * Incrementa contador de signups (quando alguém se cadastra com o código).
   */
  recordSignup(): void {
    this.props.totalSignups += 1;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  /**
   * Serializa para o formato aceito pelo Prisma.
   * Usado pelo adapter (PrismaReferralRepository) pra evitar acesso
   * direto a `props` (encapsulamento).
   */
  toRecord(): Record<string, unknown> {
    return {
      id: this.id,
      referrerRestaurantId: this.referrerRestaurantId,
      code: this.code,
      totalSignups: this.totalSignups,
      totalConversions: this.totalConversions,
      rewardCreditMonths: this.rewardCreditMonths,
      rewardCreditAppliedMonths: this['props'].rewardCreditAppliedMonths,
      status: this['props'].status,
      version: this['props'].version,
      createdAt: this['props'].createdAt,
      updatedAt: this['props'].updatedAt,
    };
  }

  /**
   * Marca uma conversão (quando o referred paga pela primeira vez).
   * Adiciona reward credit baseado no tier.
   */
  recordConversion(): number {
    this.props.totalConversions += 1;
    this.props.rewardCreditMonths += calculateRewardTier(this.props.totalConversions);
    this.props.version += 1;
    this.props.updatedAt = new Date();

    return calculateRewardTier(this.props.totalConversions);
  }

  /**
   * Aplica reward credit (decrementa saldo disponível).
   * Usado quando o restaurante usa o credit na fatura.
   */
  applyCredit(months: number): boolean {
    if (this.availableCreditMonths < months) {
      return false;
    }
    this.props.rewardCreditAppliedMonths += months;
    this.props.version += 1;
    this.props.updatedAt = new Date();
    return true;
  }

  /**
   * Cancela o programa de referral.
   */
  cancel(): void {
    this.props.status = 'cancelled';
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  /**
   * Cria um novo Referral pra um restaurante.
   */
  static create(restaurantId: string, customCode?: string): Referral {
    const now = new Date();
    return new Referral({
      id: crypto.randomUUID(),
      referrerRestaurantId: restaurantId,
      code: customCode ?? Referral.generateCode(),
      totalSignups: 0,
      totalConversions: 0,
      rewardCreditMonths: 0,
      rewardCreditAppliedMonths: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }

  /**
   * Gera código aleatório de 8 caracteres (sem I, O, 0, 1 pra evitar confusão).
   */
  static generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static reconstruct(props: ReferralProps): Referral {
    return new Referral(props);
  }
}

/**
 * Constantes do programa de referral.
 */
export const REFERRAL_CONFIG = {
  /** Mês grátis dado ao novo restaurante (referred) */
  REWARD_TO_REFERRED_MONTHS: 1,
  /** Máximo de indicados pagos por referrer (anti-abuse) */
  MAX_CONVERSIONS_PER_REFERRER: 100,
  /** Dias que cookie de referral persiste */
  COOKIE_EXPIRY_DAYS: 30,
  /** Tier máximo de reward (meses extras) */
  MAX_REWARD_TIER: 3,
  /** Mínimo de conversões pra ganhar reward */
  MIN_CONVERSIONS_FOR_REWARD: 3,
} as const;
