/**
 * Referral Repository — Interface (port)
 *
 * Define contrato que a infraestrutura (Prisma, IndexedDB, etc) deve implementar.
 * Segue o padrão DDD: domain define port, infrastructure implementa adapter.
 *
 * @see apps/web/src/domain/referral/Referral.ts
 */

import type { Referral, ReferralConversion, ReferralStatus } from '../Referral';

export interface ReferralRepository {
  /**
   * Salva (cria ou atualiza) um Referral.
   */
  save(referral: Referral): Promise<Referral>;

  /**
   * Busca Referral por ID.
   */
  findById(id: string): Promise<Referral | null>;

  /**
   * Busca Referral pelo código (único).
   */
  findByCode(code: string): Promise<Referral | null>;

  /**
   * Busca Referral do restaurante (1:1).
   */
  findByRestaurant(restaurantId: string): Promise<Referral | null>;

  /**
   * Salva uma conversão (referred → paying customer).
   */
  saveConversion(conversion: ReferralConversion): Promise<ReferralConversion>;

  /**
   * Lista conversões de um referral.
   */
  listConversions(referralId: string): Promise<ReferralConversion[]>;

  /**
   * Lista conversões onde o restaurante foi o referred (pra dar reward).
   */
  findConversionByReferredRestaurant(referredRestaurantId: string): Promise<ReferralConversion | null>;

  /**
   * Marca conversion como rewarded (já creditou meses grátis).
   */
  markConversionRewarded(conversionId: string): Promise<void>;

  /**
   * Lista top referrers (ranking).
   */
  listTopReferrers(limit: number): Promise<
    Array<{
      restaurantId: string;
      totalConversions: number;
      rewardCreditMonths: number;
    }>
  >;
}

/**
 * Interface helper pra cookies de referral.
 */
export interface ReferralCookieData {
  code: string;
  referrerRestaurantId: string;
  expiresAt: Date;
}

export interface ReferralCookieStorage {
  set(data: ReferralCookieData): void;
  get(): ReferralCookieData | null;
  clear(): void;
}