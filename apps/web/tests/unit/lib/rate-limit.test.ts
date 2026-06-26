import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite até `max` tentativas dentro da janela', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(false);
  });

  it('permite novamente após a janela passar', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1_000 });
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(limiter.check('user-a')).toBe(true);
  });

  it('keys diferentes têm contadores independentes', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-b')).toBe(true);
    expect(limiter.check('user-a')).toBe(false);
    expect(limiter.check('user-b')).toBe(false);
  });

  it('reset() limpa o contador de uma chave', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(false);
    limiter.reset('user-a');
    expect(limiter.check('user-a')).toBe(true);
  });

  it('ignora timestamps expirados na contagem', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 10_000 });

    expect(limiter.check('user-a')).toBe(true);
    vi.advanceTimersByTime(9_000);
    expect(limiter.check('user-a')).toBe(true);
    expect(limiter.check('user-a')).toBe(false);

    // Avança para que AMBOS os timestamps expirem.
    vi.advanceTimersByTime(10_001);
    expect(limiter.check('user-a')).toBe(true);
  });
});
