/**
 * Rate limiter em memória — sliding window.
 *
 * Suficiente para defesa contra brute-force casual em APIs internas
 * (login, reset-password, register). Em produção multi-instância, mover
 * para Redis (shared state) — instâncias separadas têm rate limit isolado.
 *
 * Uso típico:
 *   const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });
 *   if (!limiter.check(key)) return 429;
 *
 * O cleanup lazy (no `check`) evita jobs/timers e mantém o mapa pequeno:
 * entries fora da janela são descartadas a cada chamada.
 */

export interface RateLimiterOptions {
  /** Número máximo de tentativas dentro da janela. */
  max: number;
  /** Largura da janela em milissegundos. */
  windowMs: number;
}

export interface RateLimiter {
  /** Retorna `true` se a ação é permitida (incrementa contador), `false` se deve ser bloqueada. */
  check: (key: string) => boolean;
  /** Reseta o contador para uma chave específica (ex.: após login bem-sucedido). */
  reset: (key: string) => void;
}

export function createRateLimiter({ max, windowMs }: RateLimiterOptions): RateLimiter {
  const buckets = new Map<string, number[]>();

  function prune(arr: number[], cutoff: number): number[] {
    // filter+push in-place: mantém timestamps dentro da janela.
    const recent = arr.filter((ts) => ts > cutoff);
    return recent;
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      const cutoff = now - windowMs;
      const existing = buckets.get(key) ?? [];
      const recent = prune(existing, cutoff);
      if (recent.length >= max) {
        buckets.set(key, recent);
        return false;
      }
      recent.push(now);
      buckets.set(key, recent);
      return true;
    },
    reset(key: string): void {
      buckets.delete(key);
    },
  };
}
