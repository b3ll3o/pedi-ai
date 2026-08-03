import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes para o módulo de métricas (`apps/api/src/observability/metrics.ts`).
 *
 * Casos cobertos:
 *  - Todos os instrumentos (counters, histograms, gauges) são criados.
 *  - `startTimer` retorna função que registra duração no histogram.
 *  - `measureDuration` envolve função async e registra duração mesmo se
 *    lançar exceção (try/finally).
 *  - Métricas aceitam labels (record com atributos extras).
 */
describe('observability/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counters e histograms são exportados como instrumentos OTel', async () => {
    const m = await import('../metrics');
    expect(m.ordersCounter).toBeDefined();
    expect(m.orderValueHistogram).toBeDefined();
    expect(m.paymentsCounter).toBeDefined();
    expect(m.pixFailureCounter).toBeDefined();
    expect(m.dbQueryHistogram).toBeDefined();
    expect(m.queueJobsGauge).toBeDefined();
    expect(m.httpRequestDuration).toBeDefined();
    expect(m.httpRequestCounter).toBeDefined();
  });

  it('startTimer retorna função void que registra duração', async () => {
    const { orderValueHistogram, startTimer } = await import('../metrics');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordSpy = vi.spyOn(orderValueHistogram as any, 'record');
    recordSpy.mockClear();

    const end = startTimer(orderValueHistogram, { restaurantId: 'rest_42' });
    await new Promise((r) => setTimeout(r, 5));
    end();

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy.mock.calls[0][1]).toEqual({ restaurantId: 'rest_42' });
    expect(typeof recordSpy.mock.calls[0][0]).toBe('number');
    expect(recordSpy.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('measureDuration retorna valor da função em sucesso', async () => {
    const { dbQueryHistogram, measureDuration } = await import('../metrics');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordSpy = vi.spyOn(dbQueryHistogram as any, 'record');
    recordSpy.mockClear();

    const result = await measureDuration(dbQueryHistogram, { op: 'select' }, async () => 42);

    expect(result).toBe(42);
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });

  it('measureDuration ainda registra duração se função lançar', async () => {
    const { dbQueryHistogram, measureDuration } = await import('../metrics');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordSpy = vi.spyOn(dbQueryHistogram as any, 'record');
    recordSpy.mockClear();

    await expect(
      measureDuration(dbQueryHistogram, { op: 'insert' }, async () => {
        throw new Error('db error');
      })
    ).rejects.toThrow('db error');

    // try/finally garante que record() é chamado mesmo em erro.
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });

  it('counters aceitam add() com atributos', async () => {
    const { ordersCounter } = await import('../metrics');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addSpy = vi.spyOn(ordersCounter as any, 'add');
    addSpy.mockClear();

    ordersCounter.add(1, { restaurantId: 'rest_1', status: 'created' });
    ordersCounter.add(3, { restaurantId: 'rest_2', status: 'created' });

    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(addSpy.mock.calls[0]).toEqual([1, { restaurantId: 'rest_1', status: 'created' }]);
    expect(addSpy.mock.calls[1]).toEqual([3, { restaurantId: 'rest_2', status: 'created' }]);
  });

  it('queueJobsGauge aceita add e valores negativos (UpDownCounter)', async () => {
    const { queueJobsGauge } = await import('../metrics');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addSpy = vi.spyOn(queueJobsGauge as any, 'add');
    addSpy.mockClear();

    queueJobsGauge.add(1, { queue: 'pix', state: 'waiting' });
    queueJobsGauge.add(-1, { queue: 'pix', state: 'completed' });

    expect(addSpy).toHaveBeenCalledTimes(2);
  });
});
