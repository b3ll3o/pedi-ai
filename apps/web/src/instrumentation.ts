/**
 * Next.js Instrumentation Hook
 *
 * Documentação: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * Este arquivo é carregado UMA VEZ no boot do servidor Next.js, ANTES de qualquer
 * route handler ou middleware. É o lugar recomendado pelo Next 15+ pra inicializar
 * SDKs como Sentry, OpenTelemetry, etc.
 *
 * O Next detecta automaticamente este arquivo quando existe em:
 * - `src/instrumentation.ts` (apps com `src/` dir)
 * - `instrumentation.ts` (apps sem `src/`)
 *
 * No Next 15+ não é mais necessário `experimental.instrumentationHook: true`
 * no `next.config.ts` — a detecção é automática.
 */

export async function register() {
  // Sentry precisa ser inicializado ANTES de qualquer outro módulo pra capturar
  // erros de boot. Detecta automaticamente se está rodando em Node.js ou Edge.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
