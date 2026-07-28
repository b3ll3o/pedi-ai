/**
 * Sentry Instrumentation — Edge Runtime
 *
 * Edge runtime roda em middleware (Vercel Edge, Cloudflare Workers, etc).
 * Captura erros do `proxy.ts` (gate server-side de auth) e route handlers
 * que rodam em edge.
 *
 * **Ativação:** apenas em produção com DSN configurado.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

if (NODE_ENV === 'production' && SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs');

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.npm_package_version,
    environment: NODE_ENV,
  });
}

export {};
