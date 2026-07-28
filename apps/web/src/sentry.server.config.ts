/**
 * Sentry Instrumentation — Server-side (Node.js)
 *
 * **POR QUE server-side?**
 * Sentry SDK pro Next.js **NÃO captura erros server-side automaticamente**.
 * Para erros de Route Handlers, Middleware, Server Components e Server Actions
 * (tudo que roda no Node.js), precisamos do `@sentry/nextjs` que carrega este
 * arquivo em runtime server.
 *
 * **Quando o Sentry é ativado:**
 * - Em produção (`NODE_ENV=production`) + DSN configurado.
 * - Sem DSN configurado → no-op silencioso (não trava o boot).
 * - Em dev/test → no-op silencioso (evita poluir o console local).
 *
 * **Variáveis de ambiente:**
 * - `SENTRY_DSN` — DSN do projeto no Sentry.io.
 * - `SENTRY_TRACES_SAMPLE_RATE` — sample de performance (0.0-1.0, default 0.1).
 * - `SENTRY_RELEASE` — versão da release (default: `process.env.npm_package_version`).
 *
 * **Arquivos relacionados:**
 * - `apps/web/sentry.client.config.ts` — captura erros do browser.
 * - `apps/web/sentry.edge.config.ts` — captura erros do Edge runtime.
 */

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

// Só inicializa em produção com DSN configurado.
if (NODE_ENV === 'production' && SENTRY_DSN) {
  // Import dinâmico evita carregar o SDK em dev/test (mais rápido).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs');

  Sentry.init({
    dsn: SENTRY_DSN,

    // Sample de transações de performance.
    // 0.1 = 10% das requests são enviadas com tracing detalhado.
    // Reduzir para 0.01 (1%) em produção com muito tráfego.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),

    // Release tagging (essencial pra saber qual versão bugou).
    release: process.env.SENTRY_RELEASE ?? process.env.npm_package_version,

    // Ambiente (production / staging / development).
    environment: NODE_ENV,

    // Filtra dados sensíveis antes de enviar pro Sentry.
    // LGPD compliance: remove PII automaticamente.
    beforeSend(event) {
      // Remove IP do cliente (LGPD Art. 46).
      if (event.user?.ip_address) {
        delete event.user.ip_address;
      }
      // Mascara e-mail parcial (mantém domínio pra debug).
      if (event.user?.email && typeof event.user.email === 'string') {
        const [local, domain] = event.user.email.split('@');
        if (local && domain) {
          event.user.email = `${local.slice(0, 2)}***@${domain}`;
        }
      }
      return event;
    },
  });

  // eslint-disable-next-line no-console
  console.log('[sentry] Server-side Sentry inicializado (DSN configurado, prod)');
} else if (NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.warn(
    '[sentry] NODE_ENV=production mas SENTRY_DSN não configurado. ' +
      'Erros NÃO serão reportados. Configure SENTRY_DSN no .env.'
  );
}
// Em dev/test: no-op (não polui console, não consome memória).
