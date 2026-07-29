import { describe, it, expect } from 'vitest';

/**
 * Testes para `ObservabilityModule` (apps/api/src/observability/observability.module.ts).
 */
describe('observability/observability.module', () => {
  it('ObservabilityModule é definido', async () => {
    const { ObservabilityModule } = await import('../observability.module');
    expect(ObservabilityModule).toBeDefined();
    expect(typeof ObservabilityModule).toBe('function');
  });

  it('re-exporta logger (createLogger, rootLogger)', async () => {
    const mod = await import('../observability.module');
    expect(mod.createLogger).toBeDefined();
    expect(mod.rootLogger).toBeDefined();
    expect(typeof mod.createLogger).toBe('function');
  });

  it('re-exporta métricas (counters, histograms, gauges)', async () => {
    const mod = await import('../observability.module');
    expect(mod.ordersCounter).toBeDefined();
    expect(mod.orderValueHistogram).toBeDefined();
    expect(mod.paymentsCounter).toBeDefined();
    expect(mod.pixFailureCounter).toBeDefined();
    expect(mod.dbQueryHistogram).toBeDefined();
    expect(mod.queueJobsGauge).toBeDefined();
    expect(mod.httpRequestDuration).toBeDefined();
    expect(mod.httpRequestCounter).toBeDefined();
    expect(mod.startTimer).toBeDefined();
    expect(mod.measureDuration).toBeDefined();
  });

  it('re-exporta tracing helpers (withSpan, withSpanSync, getTracer)', async () => {
    const mod = await import('../observability.module');
    expect(typeof mod.withSpan).toBe('function');
    expect(typeof mod.withSpanSync).toBe('function');
    expect(typeof mod.getTracer).toBe('function');
  });

  it('métricas são instrumentos OTel válidos (não proxies opacos)', async () => {
    const mod = await import('../observability.module');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (mod.ordersCounter as any).add).toBe('function');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (mod.orderValueHistogram as any).record).toBe('function');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (mod.queueJobsGauge as any).add).toBe('function');
  });
});
