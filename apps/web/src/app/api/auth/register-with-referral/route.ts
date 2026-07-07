/**
 * API: POST /api/auth/register-with-referral
 *
 * Versão estendida do /auth/register que aceita `referralCode`.
 *
 * **Fluxo:**
 * 1. Valida código de referral (existe, status=pending, < 100 conversões)
 * 2. Cria User + Restaurant normalmente
 * 3. Cria ReferralConversion (status=pending) associando referredRestaurantId
 * 4. Incrementa totalSignups do Referral
 *
 * **Diferença vs /auth/register:**
 * - Aceita campo adicional `referralCode?: string`
 * - Cria ReferralConversion após sucesso
 *
 * @see apps/web/src/app/api/auth/register-with-referral/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { PrismaReferralRepository } from '@/infrastructure/persistence/referral/PrismaReferralRepository';
import { Referral } from '@/domain/referral/Referral';

// Schemas de validação
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_REFERRAL_CODE = /^[A-Z0-9]{6,12}$/;
const MAX_CONVERSIONS = 100; // anti-abuse

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, nome, senha, intent, referralCode } = body;

    // ── 1. Validação ──────────────────────────────────────────────
    if (!email || !VALID_EMAIL.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (!nome || nome.length < 3) {
      return NextResponse.json({ error: 'Nome muito curto' }, { status: 400 });
    }

    if (!senha || senha.length < 8) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    if (!['gerenciar_restaurante', 'fazer_pedidos'].includes(intent)) {
      return NextResponse.json({ error: 'Intent inválido' }, { status: 400 });
    }

    // Validação opcional do referralCode
    let referralValidation: {
      valid: boolean;
      referralId?: string;
      referrerRestaurantId?: string;
      error?: string;
    } = { valid: false };

    if (referralCode) {
      if (!VALID_REFERRAL_CODE.test(referralCode)) {
        return NextResponse.json(
          { error: 'Código de referral inválido' },
          { status: 400 }
        );
      }

      const referralRepo = new PrismaReferralRepository(prisma);
      const referral = await referralRepo.findByCode(referralCode);

      if (!referral) {
        return NextResponse.json(
          { error: 'Código de referral não encontrado' },
          { status: 404 }
        );
      }

      if (referral['props'].status !== 'pending') {
        return NextResponse.json(
          { error: 'Programa de referral não está ativo' },
          { status: 410 }
        );
      }

      if (referral.totalConversions >= MAX_CONVERSIONS) {
        return NextResponse.json(
          { error: 'Programa de referral atingiu limite' },
          { status: 410 }
        );
      }

      referralValidation = {
        valid: true,
        referralId: referral.id,
        referrerRestaurantId: referral.referrerRestaurantId,
      };
    }

    // ── 2. Verifica email duplicado ───────────────────────────────
    const existingUser = await prisma.usersProfile.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
    }

    // ── 3. Cria User + Restaurant (transação) ───────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Hash de senha (em produção: bcrypt)
      const passwordHash = await hashPassword(senha);

      // Cria User
      const user = await tx.usersProfile.create({
        data: {
          email,
          name: nome,
          role: intent === 'gerenciar_restaurante' ? 'dono' : 'cliente',
          passwordHash,
        },
      });

      // Cria Restaurant (apenas se intent é gerenciar)
      let restaurant = null;
      if (intent === 'gerenciar_restaurante') {
        restaurant = await tx.restaurant.create({
          data: {
            name: `${nome}'s Restaurant`,
            // Slug gerado a partir do nome (único)
            slug: generateUniqueSlug(nome, tx),
          },
        });

        // Associa User ao Restaurant
        await tx.usersProfile.update({
          where: { id: user.id },
          data: { restaurantId: restaurant.id },
        });
      }

      // ── 4. Cria ReferralConversion (se referral válido) ────────
      if (
        referralValidation.valid &&
        restaurant &&
        referralValidation.referrerRestaurantId !== restaurant.id // ANTI-ABUSE: não pode indicar a si mesmo
      ) {
        await tx.referralConversion.create({
          data: {
            id: crypto.randomUUID(),
            referralId: referralValidation.referralId!,
            referredRestaurantId: restaurant.id,
            status: 'pending',
            rewardMonths: 1,
          },
        });

        // Incrementa totalSignups do Referral com optimistic locking
        // Lê a versão atual, depois atualiza com WHERE version = $current
        const currentReferral = await tx.referral.findUniqueOrThrow({
          where: { id: referralValidation.referralId! },
          select: { version: true, totalSignups: true },
        });

        const updateResult = await tx.referral.updateMany({
          where: {
            id: referralValidation.referralId!,
            version: currentReferral.version, // optimistic lock
          },
          data: {
            totalSignups: { increment: 1 },
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        if (updateResult.count === 0) {
          // Versão mudou entre leituras (race condition) — falha segura
          throw new Error(
            'Conflito de versão no Referral — tente novamente'
          );
        }
      }

      return { user, restaurant };
    });

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        restaurant: result.restaurant,
        referralApplied: referralValidation.valid,
        message:
          referralValidation.valid
            ? 'Cadastro realizado! Você ganhou 1 mês grátis ao assinar.'
            : 'Cadastro realizado com sucesso.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[auth/register-with-referral] Erro:', error);

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Email já cadastrado ou código duplicado' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/**
 * Hash de senha com bcrypt.
 *
 * **IMPORTANTE:** bcrypt com cost factor 12 (~250ms por hash em hardware moderno).
 * - 12 é o padrão recomendado pelo NIST (2024)
 * - Tempo de hash ajustável via env BCRYPT_ROUNDS (default 12)
 * - bcrypt tem salt embutido (não precisa armazenar separadamente)
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
async function hashPassword(password: string): Promise<string> {
  // Import dinâmico pra evitar carregar bcrypt em rotas que não usam
  const bcrypt = await import('bcrypt');
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? '12');
  return bcrypt.hash(password, rounds);
}

async function generateUniqueSlug(
  baseName: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const slug = baseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  // Verifica se já existe
  const existing = await tx.restaurant.findUnique({ where: { slug } });
  if (!existing) return slug;

  // Adiciona sufixo numérico
  let counter = 1;
  while (counter < 100) {
    const candidate = `${slug}-${counter}`;
    const exists = await tx.restaurant.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    counter++;
  }

  // Fallback: usa UUID curto
  return `${slug}-${Math.random().toString(36).slice(2, 8)}`;
}