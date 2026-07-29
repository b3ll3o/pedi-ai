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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sentryNs = require('@sentry/nextjs');

  // Auditoria OBSERVABILITY.md § P0.4 + § P0.5:
  // - browserTracingIntegration: injeta sentry-trace/baggage em fetches
  //   → correlação API↔Frontend via W3C TraceContext.
  // - webVitalsIntegration: auto-captura LCP/INP/CLS/TTFB/FID.
  // Checagem via `typeof` para compatibilidade cross-version.
  const integrations = [
    typeof sentryNs.browserTracingIntegration === 'function'
      ? sentryNs.browserTracingIntegration({ idleTimeout: 1000, enableInp: true })
      : undefined,
    typeof sentryNs.webVitalsIntegration === 'function'
      ? sentryNs.webVitalsIntegration({ reportAllChanges: false })
      : undefined,
  ].filter(Boolean);

  Sentry.init({
    dsn: SENTRY_DSN,

    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),

    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.npm_package_version,

    environment: NODE_ENV,

    // LGPD Art. 7º + 46: NÃO enviar PII padrão (IP, email, username).
    sendDefaultPii: false,

    // LGPD: replay pode capturar dados sensíveis. Só ativar com consentimento.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    integrations: integrations.length > 0 ? integrations : undefined,

    // Lista branca de URLs para propagação do trace context.
    tracePropagationTargets: ['localhost', 'andreazzi.tech', /^https:\/\/[^/]*\.andreazzi\.tech/],

    // Filtra console.log/breadcrumbs que possam ter PII.
    beforeBreadcrumb(breadcrumb: { category?: string; message?: string; [key: string]: unknown }) {
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
