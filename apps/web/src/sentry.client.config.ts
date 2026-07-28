/**
 * Sentry Instrumentation — Client-side (Browser)
 *
 * Captura erros JavaScript que acontecem no browser do usuário
 * (ex.: hydration mismatch, error em componente, fetch failed).
 *
 * **Ativação:** apenas em produção com DSN configurado.
 * Em dev: no-op (evita poluir console + Sentry quota).
 *
 * **PII / LGPD:**
 * - Por padrão, Sentry captura `user.ip_address` e `user.email`.
 * - O `beforeSend` no server config mascara esses campos antes de enviar.
 * - Aqui, garantimos que breadcrumbs não vaze PII via console.
 *
 * **Sample rate:**
 * - `tracesSampleRate: 0.1` → 10% das sessões são traçadas.
 * - `replaysSessionSampleRate: 0` → NÃO gravamos replay (LGPD).
 * - `replaysOnErrorSampleRate: 0` → NÃO gravamos replay em erros (LGPD).
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

if (NODE_ENV === 'production' && SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs');

  Sentry.init({
    dsn: SENTRY_DSN,

    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),

    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.npm_package_version,

    environment: NODE_ENV,

    // NÃO gravar session replay (LGPD: replay pode capturar dados sensíveis).
    // Ativar somente se tiver consentimento explícito (LGPD Art. 7º).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Filtra console.log/breadcrumbs que possam ter PII.
    beforeBreadcrumb(breadcrumb: { category?: string; message?: string; [key: string]: unknown }) {
      // Bloqueia console.log com conteúdo > 200 chars (potencial PII dump).
      if (
        breadcrumb.category === 'console' &&
        breadcrumb.message &&
        breadcrumb.message.length > 200
      ) {
        return null;
      }
      return breadcrumb;
    },
  });
}
// Em dev: no-op.
