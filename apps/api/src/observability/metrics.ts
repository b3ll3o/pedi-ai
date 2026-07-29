/**
 * OpenTelemetry Metrics — registry central de métricas de negócio.
 *
 * **Por que OTel Metrics e não `prom-client` direto?**
 * - Mesma API simétrica do tracing (`tracer`/`meter`) — menos boilerplate.
 * - Reaproveita o `resource` (service.name, version, env) do tracing.ts.
 * - Funciona com qualquer exporter: Prometheus (pull) ou OTLP (push).
 *
 * **Princípio: cardinalidade controlada.**
 * Labels permitidos: `restaurant_id`, `channel`, `method`, `status`, `queue`,
 * `state`, `operation`. NUNCA usar `user_id`, `email`, `cpf`, `phone` em texto
 * claro — usar `piiHash()` (12 hex chars do HMAC-SHA256 com salt) quando
 * correlação importa. Ver OBSERVABILITY.md § LGPD.
 *
 * **RED method:**
 * - **R**ate: `pedi_orders_created_total` (counter)
 * - **E**rrors: `pedi_payments_pix_failed_total` (counter)
 * - **D**uration: `pedi_order_value_brl`, `pedi_db_query_duration_seconds` (histogram)
 *
 * Auditoria origem: OBSERVABILITY.md § P0.2.
 */

import { metrics, type Counter, type Histogram, type UpDownCounter } from '@opentelemetry/api';

const METER_NAME = 'pedi-ai-api';

let initialized = false;
function ensureInitialized(): void {
  initialized = true;
}
function getMeter() {
  ensureInitialized();
  return metrics.getMeter(METER_NAME);
}

// ── Pedidos ────────────────────────────────────────────────────────
export const ordersCounter: Counter = getMeter().createCounter('pedi_orders_created_total', {
  description: 'Total de pedidos criados',
  unit: '1',
});

export const orderValueHistogram: Histogram = getMeter().createHistogram('pedi_order_value_brl', {
  description: 'Valor do pedido em reais',
  unit: 'BRL',
});

// ── Pagamentos ──────────────────────────────────────────────────────
export const paymentsCounter: Counter = getMeter().createCounter('pedi_payments_processed_total', {
  description: 'Total de pagamentos processados',
  unit: '1',
});

export const pixFailureCounter: Counter = getMeter().createCounter(
  'pedi_payments_pix_failed_total',
  { description: 'Falhas específicas no fluxo PIX', unit: '1' }
);

// ── DB ──────────────────────────────────────────────────────────────
export const dbQueryHistogram: Histogram = getMeter().createHistogram(
  'pedi_db_query_duration_seconds',
  { description: 'Duração de queries Prisma', unit: 's' }
);

// ── Filas ───────────────────────────────────────────────────────────
export const queueJobsGauge: UpDownCounter = getMeter().createUpDownCounter('pedi_queue_jobs', {
  description: 'Número de jobs por fila/estado',
  unit: '1',
});

// ── HTTP server (RED method) ────────────────────────────────────────
export const httpRequestDuration: Histogram = getMeter().createHistogram(
  'http_server_request_duration_seconds',
  { description: 'Duração de requests HTTP', unit: 's' }
);

export const httpRequestCounter: Counter = getMeter().createCounter('http_server_requests_total', {
  description: 'Total de requests HTTP por status code',
  unit: '1',
});

/**
 * Helper para medir duração de uma operação.
 * Uso: `const end = startTimer(hist, { op: 'select' }); await fn(); end();`
 */
export function startTimer(
  histogram: Histogram,
  attributes: Record<string, string | number | boolean>
): () => void {
  const start = process.hrtime.bigint();
  return () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    histogram.record(durationSeconds, attributes);
  };
}

/** Helper para medir duração de função async (try/finally automático). */
export async function measureDuration<T>(
  histogram: Histogram,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  const end = startTimer(histogram, attributes);
  try {
    return await fn();
  } finally {
    end();
  }
}
