/**
 * Logger estruturado para a aplicação Pedi-AI.
 * Sem dependências de framework — pode ser usado em qualquer ambiente.
 *
 * Em produção (NODE_ENV=production), apenas ERROR e WARN são emitidos.
 * Em desenvolvimento, todos os níveis são emitidos.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function getCurrentLevel(): LogLevel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isProd = (process.env as any).NODE_ENV === 'production';
  return isProd ? 'warn' : 'debug';
}

function formatMessage(level: LogLevel, context: string, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`;
}

function shouldLog(level: LogLevel): boolean {
  const current = getCurrentLevel();
  return LOG_LEVELS[level] <= LOG_LEVELS[current];
}

function sanitizeMeta(meta: unknown): unknown {
  if (typeof meta !== 'object' || meta === null) return meta;
  const sensitiveKeys = /password|token|secret|key|cpf|cnpj|email|phone/i;
  if (Array.isArray(meta)) {
    return meta.map((item) => sanitizeMeta(item));
  }
  const sanitized: Record<string, unknown> = { ...(meta as Record<string, unknown>) };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeMeta(sanitized[key]);
    }
  }
  return sanitized;
}

function log(level: LogLevel, context: string, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  const sanitizedMeta = meta !== undefined ? sanitizeMeta(meta) : undefined;
  const formatted = formatMessage(level, context, message, sanitizedMeta);
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  error: (context: string, message: string, meta?: unknown) => log('error', context, message, meta),

  warn: (context: string, message: string, meta?: unknown) => log('warn', context, message, meta),

  info: (context: string, message: string, meta?: unknown) => log('info', context, message, meta),

  debug: (context: string, message: string, meta?: unknown) => log('debug', context, message, meta),
} as const;
