import type { FastifyReply } from 'fastify';

/**
 * Helper para gerenciar cookies HttpOnly Secure SameSite=Lax que armazenam
 * os tokens JWT.
 *
 * Por que cookies HttpOnly?
 * - Tokens em sessionStorage são acessíveis a qualquer script injetado via
 *   XSS. Cookies HttpOnly são imunes a XSS (`document.cookie` retorna vazio).
 * - Secure garante que só trafegam em HTTPS.
 * - SameSite=Lax mitiga CSRF para chamadas cross-site (cookies só são
 *   enviados em navegação top-level e same-site).
 * - O JWT também continua sendo retornado no body da resposta para que o
 *   cliente possa usá-lo em cenários server-side (e.g. SSR Next.js). O
 *   cookie é a fonte primária em produção.
 *
 * Configuração via env:
 * - COOKIE_SECURE (default: true em produção, false em dev) — quando false,
 *   permite Set-Cookie sem Secure para testes locais em HTTP.
 * - COOKIE_DOMAIN (default: undefined) — se definido, aplica o domain
 *   (ex: `.pedi-ai.com` para subdomínios compartilhados).
 * - COOKIE_SAMESITE (default: 'lax') — `strict`, `lax`, `none`.
 */

const ACCESS_TOKEN_COOKIE = 'pedi_ai_access';
const REFRESH_TOKEN_COOKIE = 'pedi_ai_refresh';

export interface CookieOptions {
  maxAgeMs: number;
}

function buildBaseCookieOptions(maxAgeMs: number) {
  const isProd = process.env.NODE_ENV === 'production';
  const secureEnv = process.env.COOKIE_SECURE;
  const secure = secureEnv === undefined ? isProd : secureEnv === 'true';
  const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax') as 'strict' | 'lax' | 'none';
  const domain = process.env.COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

/**
 * Define os cookies de access + refresh token na resposta.
 */
export function setAuthCookies(
  reply: FastifyReply,
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessMaxAgeMs: number;
    refreshMaxAgeMs: number;
  }
): void {
  reply.setCookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    buildBaseCookieOptions(tokens.accessMaxAgeMs)
  );
  reply.setCookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    buildBaseCookieOptions(tokens.refreshMaxAgeMs)
  );
}

/**
 * Limpa ambos os cookies na resposta (logout).
 *
 * **Auditoria B5**: o `Clear-Cookie` precisa espelhar o domínio do `Set-Cookie`
 * (RFC 6265 §4.1.2 — atributos devem bater para o navegador tratar como
 * overwrite). Antes, `clearAuthCookies` ignorava `COOKIE_DOMAIN`, então em
 * produção com subdomínios compartilhados (api.pedi-ai.com ↔ app.pedi-ai.com)
 * o logout podia falhar silenciosamente.
 */
export function clearAuthCookies(reply: FastifyReply): void {
  // Reaproveita buildBaseCookieOptions com maxAge=0 para garantir simetria total
  // (httpOnly, secure, sameSite, domain, path) com o `setAuthCookies`.
  const baseOpts = buildBaseCookieOptions(0);
  reply.clearCookie(ACCESS_TOKEN_COOKIE, {
    path: baseOpts.path,
    domain: baseOpts.domain,
  });
  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    path: baseOpts.path,
    domain: baseOpts.domain,
  });
}

/**
 * Lê o access token dos cookies da requisição. Retorna null se ausente.
 */
export function readAccessTokenFromCookies(
  cookies: Record<string, string | undefined> | undefined
): string | null {
  if (!cookies) return null;
  return cookies[ACCESS_TOKEN_COOKIE] ?? null;
}

/**
 * Lê o refresh token dos cookies. Retorna null se ausente.
 */
export function readRefreshTokenFromCookies(
  cookies: Record<string, string | undefined> | undefined
): string | null {
  if (!cookies) return null;
  return cookies[REFRESH_TOKEN_COOKIE] ?? null;
}

export const COOKIE_NAMES = {
  access: ACCESS_TOKEN_COOKIE,
  refresh: REFRESH_TOKEN_COOKIE,
};
