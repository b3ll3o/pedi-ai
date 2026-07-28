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

interface ReferralValidation {
  valid: boolean;
  referralId?: string;
  referrerRestaurantId?: string;
}

interface RegisterBody {
  email?: unknown;
  nome?: unknown;
  senha?: unknown;
  intent?: unknown;
  referralCode?: unknown;
}

/**
 * Validação dos campos básicos (email, nome, senha, intent).
 * Retorna null se OK, ou uma Response 400 com a mensagem de erro.
 */
function validateBasicFields(body: RegisterBody): NextResponse | null {
  const { email, nome, senha, intent } = body;

  if (!email || typeof email !== 'string' || !VALID_EMAIL.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  if (!nome || typeof nome !== 'string' || nome.length < 3) {
    return NextResponse.json({ error: 'Nome muito curto' }, { status: 400 });
  }

  if (!senha || typeof senha !== 'string' || senha.length < 8) {
    return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 });
  }

  if (intent !== 'gerenciar_restaurante' && intent !== 'fazer_pedidos') {
    return NextResponse.json({ error: 'Intent inválido' }, { status: 400 });
  }

  return null;
}

/**
 * Valida o código de referral (opcional). Retorna null se OK ou
 * se não foi fornecido. Retorna a ReferralValidation populate se válido,
 * ou uma Response de erro.
 */
async function validateReferralCode(
  referralCode: string | undefined
): Promise<{ ok: true; validation: ReferralValidation } | { ok: false; response: NextResponse }> {
  if (!referralCode) {
    return { ok: true, validation: { valid: false } };
  }

  if (!VALID_REFERRAL_CODE.test(referralCode)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Código de referral inválido' }, { status: 400 }),
    };
  }

  const referralRepo = new PrismaReferralRepository(prisma);
  const referral = await referralRepo.findByCode(referralCode);

  if (!referral) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Código de referral não encontrado' }, { status: 404 }),
    };
  }

  if (referral['props'].status !== 'pending') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Programa de referral não está ativo' },
        { status: 410 }
      ),
    };
  }

  if (referral.totalConversions >= MAX_CONVERSIONS) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Programa de referral atingiu limite' },
        { status: 410 }
      ),
    };
  }

  return {
    ok: true,
    validation: {
      valid: true,
      referralId: referral.id,
      referrerRestaurantId: referral.referrerRestaurantId,
    },
  };
}

/**
 * Cria ReferralConversion dentro de uma transação Prisma.
 * Idempotente via optimistic locking no campo `version`.
 */
async function createReferralConversion(
  tx: Prisma.TransactionClient,
  referralValidation: ReferralValidation,
  restaurantId: string
): Promise<void> {
  // ANTI-ABUSE: não pode indicar a si mesmo
  if (
    !referralValidation.valid ||
    !referralValidation.referralId ||
    referralValidation.referrerRestaurantId === restaurantId
  ) {
    return;
  }

  await tx.referralConversion.create({
    data: {
      id: crypto.randomUUID(),
      referralId: referralValidation.referralId,
      referredRestaurantId: restaurantId,
      status: 'pending',
      rewardMonths: 1,
    },
  });

  // Incrementa totalSignups do Referral com optimistic locking
  const currentReferral = await tx.referral.findUniqueOrThrow({
    where: { id: referralValidation.referralId },
    select: { version: true, totalSignups: true },
  });

  const updateResult = await tx.referral.updateMany({
    where: {
      id: referralValidation.referralId,
      version: currentReferral.version,
    },
    data: {
      totalSignups: { increment: 1 },
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    throw new Error('Conflito de versão no Referral — tente novamente');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterBody;
    const { email, nome, senha, intent, referralCode } = body;

    // ── 1. Validação ─────────────────────────────────────────
    const basicError = validateBasicFields(body);
    if (basicError) return basicError;

    const referralResult = await validateReferralCode(
      typeof referralCode === 'string' ? referralCode : undefined
    );
    if (!referralResult.ok) return referralResult.response;
    const referralValidation = referralResult.validation;

    // ── 2. Verifica email duplicado ───────────────────────────
    const existingUser = await prisma.usersProfile.findUnique({
      where: { email: email as string },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
    }

    // ── 3. Cria User + Restaurant (transação) ────────────────
    const typedIntent = intent as 'gerenciar_restaurante' | 'fazer_pedidos';
    const typedEmail = email as string;
    const typedNome = nome as string;
    const typedSenha = senha as string;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const passwordHash = await hashPassword(typedSenha);

      const user = await tx.usersProfile.create({
        data: {
          email: typedEmail,
          name: typedNome,
          role: typedIntent === 'gerenciar_restaurante' ? 'dono' : 'cliente',
          passwordHash,
        },
      });

      let restaurant = null;
      if (typedIntent === 'gerenciar_restaurante') {
        restaurant = await tx.restaurant.create({
          data: {
            name: `${typedNome}'s Restaurant`,
            slug: await generateUniqueSlug(typedNome, tx),
          },
        });

        await tx.usersProfile.update({
          where: { id: user.id },
          data: { restaurantId: restaurant.id },
        });
      }

      // ── 4. Cria ReferralConversion (se referral válido) ────
      if (restaurant) {
        await createReferralConversion(tx, referralValidation, restaurant.id);
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
        message: referralValidation.valid
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

async function generateUniqueSlug(baseName: string, tx: Prisma.TransactionClient): Promise<string> {
  const slug = baseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  // Verifica se já existe. `slug` não é `@unique` no schema (constraint fica
  // na camada de aplicação); usamos `findFirst` em vez de `findUnique`.
  const existing = await tx.restaurant.findFirst({ where: { slug } });
  if (!existing) return slug;

  // Adiciona sufixo numérico
  let counter = 1;
  while (counter < 100) {
    const candidate = `${slug}-${counter}`;
    const exists = await tx.restaurant.findFirst({ where: { slug: candidate } });
    if (!exists) return candidate;
    counter++;
  }

  // Fallback: usa UUID curto
  return `${slug}-${Math.random().toString(36).slice(2, 8)}`;
}
