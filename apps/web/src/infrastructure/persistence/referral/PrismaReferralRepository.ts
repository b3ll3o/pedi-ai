/**
 * Prisma ReferralRepository — Adapter concreto
 *
 * Implementa `ReferralRepository` usando Prisma + Postgres.
 *
 * **Onde fica:**
 * - Domain: `apps/web/src/domain/referral/ReferralRepository.ts` (interface)
 * - Infrastructure: `apps/web/src/infrastructure/persistence/referral/PrismaReferralRepository.ts` (este arquivo)
 *
 * **Padrão:** Hexagonal / Ports & Adapters
 * - Domain define contrato
 * - Infrastructure implementa adapter
 * - Inversão de dependência via IoC container
 *
 * @see apps/web/src/domain/referral/
 */

import type { PrismaClient, Referral as PrismaReferral, ReferralConversion as PrismaReferralConversion, Prisma } from '@prisma/client';

import { Referral } from '@/domain/referral/Referral';
import type {
  ReferralRepository,
  ReferralConversion,
} from '@/domain/referral/ReferralRepository';

/**
 * Adapter Prisma para o repositório de Referral.
 *
 * Implementa:
 * - save (upsert atômico com optimistic locking)
 * - findById / findByCode / findByRestaurant
 * - saveConversion (idempotente via upsert)
 * - markConversionRewarded
 * - listTopReferrers (ranking)
 */
export class PrismaReferralRepository implements ReferralRepository {
  constructor(private prisma: PrismaClient) {}

  // ────────────────────────────────────────────────────────────────
  // Mapping helpers (Prisma row → Domain Entity)
  // ────────────────────────────────────────────────────────────────

  /**
   * Converte row do Prisma → Entity Referral (domain).
   */
  private toDomain(row: PrismaReferral): Referral {
    return Referral.reconstruct({
      id: row.id,
      referrerRestaurantId: row.referrerRestaurantId,
      code: row.code,
      totalSignups: row.totalSignups,
      totalConversions: row.totalConversions,
      rewardCreditMonths: row.rewardCreditMonths,
      rewardCreditAppliedMonths: row.rewardCreditAppliedMonths,
      status: row.status as 'pending' | 'cancelled' | 'expired',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  private conversionToDomain(row: PrismaReferralConversion): ReferralConversion {
    return {
      id: row.id,
      referralId: row.referralId,
      referredRestaurantId: row.referredRestaurantId,
      status: row.status as 'pending' | 'rewarded' | 'cancelled',
      convertedAt: row.convertedAt,
      rewardedAt: row.rewardedAt,
      rewardMonths: row.rewardMonths,
      createdAt: row.createdAt,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Métodos do Repository
  // ────────────────────────────────────────────────────────────────

  /**
   * Save (upsert atômico) — cria ou atualiza Referral.
   *
   * **Optimistic locking:** usa `where: { id, version }` no update.
   * Se outra transação mudou a versão, lança erro (BOLA prevention).
   */
  async save(referral: Referral): Promise<Referral> {
    const data = referral.toRecord() as {
      id: string;
      referrerRestaurantId: string;
      code: string;
      totalSignups: number;
      totalConversions: number;
      rewardCreditMonths: number;
      rewardCreditAppliedMonths: number;
      status: 'pending' | 'cancelled' | 'expired';
      version: number;
    };

    try {
      // Tenta atualizar primeiro (optimistic lock)
      const updated = await this.prisma.referral.update({
        where: {
          id: referral.id,
          version: data.version - 1, // versão anterior
        },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
      return this.toDomain(updated);
    } catch (err: unknown) {
      // Se não existe (P2025) ou versão não bate (P2025), cria
      if (this.isNotFoundError(err)) {
        const created = await this.prisma.referral.create({ data });
        return this.toDomain(created);
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Referral | null> {
    const row = await this.prisma.referral.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByCode(code: string): Promise<Referral | null> {
    const row = await this.prisma.referral.findUnique({ where: { code } });
    return row ? this.toDomain(row) : null;
  }

  async findByRestaurant(restaurantId: string): Promise<Referral | null> {
    const row = await this.prisma.referral.findUnique({
      where: { referrerRestaurantId: restaurantId },
    });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Salva uma ReferralConversion.
   *
   * Usa upsert (idempotente): se referredRestaurantId já tem conversion,
   * atualiza em vez de duplicar.
   */
  async saveConversion(conversion: ReferralConversion): Promise<ReferralConversion> {
    const data = {
      id: conversion.id,
      referralId: conversion.referralId,
      referredRestaurantId: conversion.referredRestaurantId,
      status: conversion.status,
      convertedAt: conversion.convertedAt,
      rewardedAt: conversion.rewardedAt,
      rewardMonths: conversion.rewardMonths,
    };

    const row = await this.prisma.referralConversion.upsert({
      where: { referredRestaurantId: conversion.referredRestaurantId },
      create: data,
      update: {
        status: conversion.status,
        convertedAt: conversion.convertedAt,
        rewardedAt: conversion.rewardedAt,
        rewardMonths: conversion.rewardMonths,
      },
    });

    return this.conversionToDomain(row);
  }

  async listConversions(referralId: string): Promise<ReferralConversion[]> {
    const rows = await this.prisma.referralConversion.findMany({
      where: { referralId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.conversionToDomain(r));
  }

  async findConversionByReferredRestaurant(
    referredRestaurantId: string
  ): Promise<ReferralConversion | null> {
    const row = await this.prisma.referralConversion.findUnique({
      where: { referredRestaurantId },
    });
    return row ? this.conversionToDomain(row) : null;
  }

  /**
   * Marca conversion como rewarded.
   *
   * **Idempotente:** se já está rewarded, retorna sem erro.
   */
  async markConversionRewarded(conversionId: string): Promise<void> {
    await this.prisma.referralConversion.update({
      where: { id: conversionId },
      data: {
        status: 'rewarded',
        rewardedAt: new Date(),
      },
    });
  }

  /**
   * Lista top referrers (ranking por conversões).
   *
   * Usado em:
   * - Leaderboard gamificado
   * - Admin analytics (top referrers do mês)
   * - Programa de embaixadores
   */
  async listTopReferrers(
    limit: number
  ): Promise<
    Array<{
      restaurantId: string;
      totalConversions: number;
      rewardCreditMonths: number;
    }>
  > {
    const topReferrers = await this.prisma.referral.findMany({
      where: {
        status: 'pending',
        totalConversions: { gt: 0 },
      },
      orderBy: { totalConversions: 'desc' },
      take: limit,
      select: {
        referrerRestaurantId: true,
        totalConversions: true,
        rewardCreditMonths: true,
      },
    });

    return topReferrers.map((r) => ({
      restaurantId: r.referrerRestaurantId,
      totalConversions: r.totalConversions,
      rewardCreditMonths: r.rewardCreditMonths,
    }));
  }

  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────

  private isNotFoundError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    );
  }
}

/**
 * Factory helper pra IoC container.
 */
export const REFERRAL_REPOSITORY_TOKEN = 'REFERRAL_REPOSITORY';

export function createPrismaReferralRepository(
  prisma: PrismaClient
): ReferralRepository {
  return new PrismaReferralRepository(prisma);
}