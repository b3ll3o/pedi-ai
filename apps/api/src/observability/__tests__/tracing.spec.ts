import { describe, it, expect } from 'vitest';
import { SpanStatusCode } from '@opentelemetry/api';

/**
 * Testes para o helper `withSpan` / `withSpanSync` (apps/api/src/observability/tracing.ts).
 */
describe('observability/tracing', () => {
  it('withSpan retorna valor da função em sucesso', async () => {
    const { withSpan } = await import('../tracing');
    const result = await withSpan('test.span', async () => 42);
    expect(result).toBe(42);
  });

  it('withSpan aceita atributos customizados', async () => {
    const { withSpan } = await import('../tracing');
    const result = await withSpan(
      'test.span.attrs',
      async (span) => {
        expect(span).toBeDefined();
        expect(typeof span.setAttribute).toBe('function');
        expect(typeof span.end).toBe('function');
        return 'ok';
      },
      { restaurantId: 'rest_42', items: 3 }
    );
    expect(result).toBe('ok');
  });

  it('withSpan propaga exceção e marca span como ERROR', async () => {
    const { withSpan } = await import('../tracing');

    await expect(
      withSpan('test.span.error', async (span) => {
        expect(span).toBeDefined();
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
  });

  it('withSpan NÃO captura exceção — propaga para o caller', async () => {
    const { withSpan } = await import('../tracing');

    let caught = false;
    try {
      await withSpan('test.rethrow', async () => {
        throw new Error('must propagate');
      });
    } catch (err) {
      caught = true;
      expect((err as Error).message).toBe('must propagate');
    }
    expect(caught).toBe(true);
  });

  it('withSpanSync funciona para funções síncronas', async () => {
    const { withSpanSync } = await import('../tracing');
    const result = withSpanSync('test.sync', () => 'sync-result');
    expect(result).toBe('sync-result');
  });

  it('withSpanSync propaga erro síncrono', async () => {
    const { withSpanSync } = await import('../tracing');
    expect(() =>
      withSpanSync('test.sync.error', () => {
        throw new Error('sync boom');
      })
    ).toThrow('sync boom');
  });

  it('getTracer retorna tracer sem crash', async () => {
    const { getTracer } = await import('../tracing');
    const tracer = getTracer();
    expect(tracer).toBeDefined();
    expect(typeof tracer.startActiveSpan).toBe('function');
  });

  it('SpanStatusCode OK/ERROR importados corretamente', () => {
    expect(SpanStatusCode.OK).toBeDefined();
    expect(SpanStatusCode.ERROR).toBeDefined();
    expect(SpanStatusCode.OK).not.toBe(SpanStatusCode.ERROR);
  });
});
