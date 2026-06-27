/**
 * Logger local do SDK de feature flags.
 *
 * Stub mínimo. O SDK não depende do logger estruturado do `@/lib/logger`
 * da aplicação para manter o pacote desacoplado. Quando importado em
 * ambiente browser/Next.js, este logger emite via `console`; quando
 * importado em testes Node, também via `console`.
 *
 * Assinatura alinhada com `apps/web/src/lib/logger.ts` — métodos `warn` e
 * `error` com `(context, message, meta?)`.
 */

export const logger = {
  warn(context: string, message: string, meta?: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(`[${context}] ${message}`, meta ?? '');
  },
  error(context: string, message: string, meta?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(`[${context}] ${message}`, meta ?? '');
  },
};
