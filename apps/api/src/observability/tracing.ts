/**
 * Custom tracing helper — encapsula OpenTelemetry spans de negócio.
 *
 * **Por que este helper e não `tracer.startActiveSpan` direto?**
 * - Padroniza atributos (`service.name`, `service.env`).
 * - Captura exceções e marca o span como ERROR automaticamente.
 * - Logs de eventos estruturados (`span.addEvent`).
 *
 * **Uso:**
 * ```ts
 * await withSpan('pedi.order.create', async (span) => {
 *   span.setAttribute('restaurant_id', restaurantId);
 *   // ... lógica ...
 * });
 * ```
 *
 * Auditoria origem: OBSERVABILITY.md § P0.3.
 */

import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';

const TRACER_NAME = 'pedi-ai-api';

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttribute('service.name', process.env.OTEL_SERVICE_NAME ?? 'pedi-ai-api');
    span.setAttribute('service.env', process.env.NODE_ENV ?? 'development');
    for (const [k, v] of Object.entries(attributes)) {
      span.setAttribute(k, v);
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message?.slice(0, 200),
      });
      throw err;
    } finally {
      span.end();
    }
  });
}

export function withSpanSync<T>(
  name: string,
  fn: (span: Span) => T,
  attributes: Record<string, string | number | boolean> = {}
): T {
  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(name, (span) => {
    span.setAttribute('service.name', process.env.OTEL_SERVICE_NAME ?? 'pedi-ai-api');
    for (const [k, v] of Object.entries(attributes)) {
      span.setAttribute(k, v);
    }
    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message?.slice(0, 200),
      });
      throw err;
    } finally {
      span.end();
    }
  });
}

export function getTracer() {
  return trace.getTracer(TRACER_NAME);
}
