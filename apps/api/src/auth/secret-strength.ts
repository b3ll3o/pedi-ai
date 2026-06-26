/**
 * Validador de força de segredos HMAC/JWT.
 *
 * Aplicado em boot (auth.module.ts) para falhar cedo se o ambiente estiver
 * usando o placeholder de `.env.example` (ex.: "your-super-secret-..."),
 * um valor curto, ou uma string previsível.
 *
 * Requisitos mínimos:
 * - ≥ 32 caracteres (256 bits de entropia mínima assumindo string random).
 * - Não estar na lista de placeholders conhecidos.
 * - Não ser igual ao nome da variável (pegadinha comum).
 *
 * Ambientes:
 * - `production` / `staging` → falham em segredo fraco (auditoria M8).
 *   staging também trata como prod porque expõe dados reais em muitos casos.
 * - `development` / outros → permite fallback com warning para onboarding.
 */
import { Logger } from '@nestjs/common';
const KNOWN_PLACEHOLDERS = [
  'your-super-secret',
  'change-in-production',
  'changeme',
  'changeme123',
  'secret',
  'password',
  'admin',
  'dev-secret',
];

const MIN_SECRET_LENGTH = 32;
const MIN_SECRET_HEX_LENGTH = 64; // 32 bytes hex = 64 chars

/** Ambientes que devem ser tratados como "produção" para fins de validação. */
const STRICT_ENVS = new Set(['production', 'staging']);

export function isStrictEnv(): boolean {
  return STRICT_ENVS.has(process.env.NODE_ENV ?? '');
}

export function assertSecretStrength(
  name: string,
  value: string | undefined | null,
  // Auditoria ACHADO-N38 (Re-varredura 9): aceitar Logger injetado —
  // antes usava `console.warn` que bypassa `nestjs-pino`/correlation-id.
  logger?: Logger
): void {
  if (!value || value.length === 0) {
    if (isStrictEnv()) {
      throw new Error(`${name} é obrigatório em ${process.env.NODE_ENV}`);
    }
    return;
  }

  const isStrict = isStrictEnv();

  // Placeholders conhecidos — sempre falha (mesmo em dev) porque indica erro
  // de configuração, não intenção.
  const lower = value.toLowerCase();
  for (const ph of KNOWN_PLACEHOLDERS) {
    if (lower.includes(ph)) {
      throw new Error(
        `${name} contém placeholder conhecido ("${ph}"). ` +
          `Gere um valor real com: openssl rand -hex 32`
      );
    }
  }

  // Segredo igual ao nome — pegadinha comum ("JWT_SECRET=JWT_SECRET").
  if (lower === name.toLowerCase()) {
    throw new Error(`${name} está definido como o próprio nome da variável`);
  }

  // Comprimento mínimo.
  const effectiveMin = /^[0-9a-f]+$/.test(value) ? MIN_SECRET_HEX_LENGTH : MIN_SECRET_LENGTH;
  if (value.length < effectiveMin) {
    if (isStrict) {
      throw new Error(
        `${name} deve ter ≥ ${effectiveMin} caracteres ` +
          `(atual: ${value.length}). Gere com: openssl rand -hex 32`
      );
    }
    // Em dev só avisamos — não bloqueia onboarding.

    const msg =
      `[auth] AVISO: ${name} tem ${value.length} caracteres; ` +
      `recomenda-se ≥ ${effectiveMin}. Use openssl rand -hex 32 em produção.`;
    if (logger) {
      logger.warn(msg);
    } else {
      // Fallback silencioso em produção sem logger (improvável mas seguro).

      console.warn(msg);
    }
  }
}
