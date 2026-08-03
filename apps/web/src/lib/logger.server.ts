/**
 * Server-side logger (pino) para o Next.js.
 *
 * **Por que pino em vez do logger.ts atual (texto)?**
 * - Logs JSON permitem query em Loki sem regex em texto livre.
 * - Correlação com requestId via mixin.
 *
 * **Quando usa?**
 * - Server Components, Route Handlers, Server Actions (Node.js runtime).
 * - Edge runtime: pino NÃO roda — usar `console.warn`.
 *
 * Auditoria origem: OBSERVABILITY.md § P0.1.
 */

const SERVICE_NAME = 'pedi-ai-web';
const LOG_LEVEL =
  process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const PII_PATHS = [
  '*.email',
  '*.customerEmail',
  '*.password',
  '*.token',
  '*.secret',
  '*.cpf',
  '*.cnpj',
  '*.phone',
  'req.headers.cookie',
  'req.headers.authorization',
];

interface LoggerOptions {
  name: string;
  requestId?: string;
}

/** Cria uma instância pino server-side (lazy import). */
export async function createServerLogger(opts: LoggerOptions): Promise<unknown> {
  const pinoModule = await import('pino');
  const pino = pinoModule.default;
  return pino({
    level: LOG_LEVEL,
    base: { service: SERVICE_NAME, env: process.env.NODE_ENV ?? 'development', name: opts.name },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label: string) => ({ level: label }) },
    redact: { paths: PII_PATHS, censor: '[REDACTED]' },
    mixin() {
      return { ...(opts.requestId ? { request_id: opts.requestId } : {}) };
    },
  });
}

/** Helper one-shot para emitir log sem criar instance por chamada. */
export async function serverLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  context: string,
  message: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const pinoModule = await import('pino');
    const pino = pinoModule.default;
    const logger = pino({
      level: LOG_LEVEL,
      base: { service: SERVICE_NAME, env: process.env.NODE_ENV ?? 'development', name: context },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label: string) => ({ level: label }) },
      redact: { paths: PII_PATHS, censor: '[REDACTED]' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (logger as any)[level](meta ?? {}, message);
  } catch {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level}] [${context}] ${message}`, meta);
  }
}
