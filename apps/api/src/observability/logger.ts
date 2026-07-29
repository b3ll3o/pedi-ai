/**
 * Structured Logger (pino) com correlação OTel + redação PII.
 *
 * **Por que pino e não o `Logger` do Nest?**
 * - 5× mais rápido que winston (overhead mínimo em hot path).
 * - Saída JSON nativa → Loki/Elasticsearch parseia direto, sem regex.
 * - API ergonômica: `logger.info({ key: 'val' }, 'msg')`.
 *
 * **Mixin automático de trace context:**
 * Cada log carrega `traceId`/`spanId` do **active OTel span**. Em prod isso
 * preenche `trace_id`/`span_id` no JSON, permitindo join com Grafana Tempo
 * via `{trace_id="abc"}` no LogQL — busca o log exato de um trace, ou o
 * trace exato a partir de um log de erro 500.
 *
 * **Correlação com requestId:**
 * `requestId` vem do `RequestIdMiddleware` (header `x-request-id`).
 *
 * **LGPD:**
 * Redaction automática em paths conhecidos (`*.email`, `*.password`, etc) +
 * mixin `maskPii()` aplicado no hook `logMethod` para varrer objetos compostos.
 *
 * **Variáveis de ambiente:**
 * - `LOG_LEVEL`: pino level (default `info` prod / `debug` dev)
 * - `LOKI_URL`/`LOKI_USER`/`LOKI_API_KEY`: se setados, envia para Loki também
 *
 * Auditoria origem: OBSERVABILITY.md § P0.1.
 */

import { context, trace } from '@opentelemetry/api';
import type { IncomingMessage } from 'http';
import pino, { type Logger as PinoLogger } from 'pino';

// pino-loki: import dinâmico em runtime (require). Tipagem fraca via any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PinoLokiTransport = any;

import { maskPii } from '../common/logger/pii-mask';

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'pedi-ai-api';
const LOG_LEVEL =
  process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/** Extrai traceId/spanId do span ativo OTel. */
function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getSpan(context.active());
  if (!span) return {};
  const ctx = span.spanContext();
  if (!ctx || ctx.traceId === '00000000000000000000000000000000') return {};
  return { traceId: ctx.traceId, spanId: ctx.spanId };
}

/** Extrai requestId do IncomingMessage (anexado pelo RequestIdMiddleware). */
function getRequestId(req?: IncomingMessage): { requestId?: string } {
  if (!req) return {};
  const r = req as IncomingMessage & { id?: string; requestId?: string };
  const id = r.id ?? r.requestId;
  return id ? { requestId: id } : {};
}

/** Redactor — reusa maskPii para garantir consistência com resto do código. */
const PII_PATHS = [
  '*.email',
  '*.customerEmail',
  '*.customer_email',
  '*.password',
  '*.token',
  '*.secret',
  '*.cpf',
  '*.cnpj',
  '*.phone',
  '*.customerPhone',
  '*.customer_phone',
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
];

function buildLokiTransport(): pino.DestinationStream | undefined {
  const url = process.env.LOKI_URL;
  const user = process.env.LOKI_USER;
  const apiKey = process.env.LOKI_API_KEY;
  if (!url || !user || !apiKey) return undefined;
  try {
    // require dinâmico para evitar custo quando desabilitado
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pinoLoki = require('pino-loki') as (opts: unknown) => PinoLokiTransport;
    return pinoLoki({
      host: url,
      basicAuth: { username: user, password: apiKey },
      labels: { service: SERVICE_NAME, env: process.env.NODE_ENV ?? 'development' },
      silenceErrors: true, // falha no envio NÃO derruba a API
    }) as pino.DestinationStream;
  } catch {
    return undefined;
  }
}

/**
 * Cria uma instância de logger pino com mixins OTel + RequestId.
 *
 * Uso:
 * ```ts
 * const logger = createLogger({ name: 'OrdersService' });
 * logger.info({ restaurantId: 'rest_42' }, 'Pedido criado');
 * ```
 */
export function createLogger(opts: { name: string; req?: IncomingMessage }): PinoLogger {
  const transport = buildLokiTransport();
  return pino({
    level: LOG_LEVEL,
    base: {
      service: SERVICE_NAME,
      env: process.env.NODE_ENV ?? 'development',
      name: opts.name,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: { paths: PII_PATHS, censor: '[REDACTED]' },
    // Mixin roda em CADA log — injeta trace/span/requestId.
    mixin() {
      return { ...getTraceContext(), ...getRequestId(opts.req) };
    },
    // Hook para sanitizar objetos compostos (PII aninhada).
    // Aplica `maskPii` em plain objects; deixa Error/Date/Buffer intactos.
    hooks: {
      logMethod(inputArgs: unknown[], _method: unknown): unknown[] {
        if (inputArgs.length === 0) return inputArgs;
        const first = inputArgs[0];
        // Só aplica maskPii em objetos "plain" (não Error, Date, Buffer).
        if (
          first &&
          typeof first === 'object' &&
          !Array.isArray(first) &&
          !(first instanceof Error) &&
          !(first instanceof Date) &&
          !Buffer.isBuffer(first)
        ) {
          inputArgs[0] = maskPii(first as Record<string, unknown>);
        }
        return inputArgs;
      },
    },
    transport:
      (transport ?? process.env.NODE_ENV === 'production')
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
          },
  });
}

/** Singleton de logger sem request context (bootstrap, jobs, etc). */
export const rootLogger: PinoLogger = createLogger({ name: 'app' });
