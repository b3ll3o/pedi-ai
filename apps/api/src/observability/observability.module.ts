/**
 * Módulo de observabilidade — concentra controller + helpers.
 *
 * Outros módulos (orders, payments, queues) importam daqui para emitir
 * métricas/spans sem precisar conhecer detalhes do OTel.
 *
 * Auditoria origem: OBSERVABILITY.md § P0.2.
 */

import { Module } from '@nestjs/common';

import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
})
export class ObservabilityModule {}

// Re-exports ergonômicos para uso fora de providers Nest.
export { createLogger, rootLogger } from './logger';
export {
  ordersCounter,
  orderValueHistogram,
  paymentsCounter,
  pixFailureCounter,
  dbQueryHistogram,
  queueJobsGauge,
  httpRequestDuration,
  httpRequestCounter,
  startTimer,
  measureDuration,
} from './metrics';
export { withSpan, withSpanSync, getTracer } from './tracing';
