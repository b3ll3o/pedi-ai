/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 *
 * SDK cliente de Feature Flags para o front.
 *
 * Comportamentos críticos:
 *  - Polling a cada `pollIntervalMs` (default 30 s) contra
 *    `GET {baseUrl}/evaluate?keys=...&restaurantId=...&userId=...`.
 *  - Cache em memória (Map) + ETag em `localStorage` (`ff:etag`).
 *    Envia `If-None-Match` quando há ETag prévia; trata `304 Not Modified`.
 *  - Fallback por chave: se rede falhar ou resposta não-OK, retorna o valor
 *    passado em `evaluate(keys, ctx, fallback)` — preserva UX offline
 *    (alinhado a RNF-AVAIL-FF-01).
 *  - Listener pattern para reatividade (Provider consome via subscribe).
 *
 * Princípios:
 *  - Sem dependência de React. Provider é uma camada fina por cima.
 *  - Idempotente: pode receber `start()` várias vezes sem duplicar timers.
 *  - SSR-safe: `start()` deve ser chamado apenas client-side.
 */
import { logger } from './logger';

import type {
  EvaluationContext,
  FeatureFlagClientConfig,
  FlagValue,
  SnapshotListener,
} from './types';

const DEFAULT_POLL_MS = 30_000;
const DEFAULT_ETAG_KEY = 'ff:etag';

export class FeatureFlagClient {
  private readonly baseUrl: string;
  private readonly pollIntervalMs: number;
  private readonly etagKey: string;
  private readonly fetcher: typeof fetch;

  /** Cache em memória: chave da flag → valor avaliado. */
  private readonly cache = new Map<string, FlagValue>();

  /** Listeners notificados quando o snapshot muda. */
  private readonly listeners = new Set<SnapshotListener>();

  /** Timer do polling. */
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Keys atualmente sob polling — usadas para reavaliar no próximo tick. */
  private currentKeys: string[] = [];
  private currentCtx: EvaluationContext = {};

  constructor(config: FeatureFlagClientConfig) {
    this.baseUrl = config.baseUrl;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_MS;
    this.etagKey = config.etagStorageKey ?? DEFAULT_ETAG_KEY;
    this.fetcher = config.fetcher ?? globalThis.fetch?.bind(globalThis);
  }

  // ──────────────────────────────────────────────────────────────────────
  // API pública — leitura
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Avalia chaves no servidor e retorna mapa `{ key: valor }`.
   * Atualiza cache local + listeners. Em falha, retorna `fallback[key]`.
   *
   * @param keys     Chaves a avaliar (1..32).
   * @param ctx      Contexto (restaurantId/userId).
   * @param fallback Mapa fallback opcional por chave — aplicado em rede/erro.
   */
  async evaluate(
    keys: string[],
    ctx: EvaluationContext = {},
    fallback: Record<string, FlagValue> = {}
  ): Promise<Record<string, FlagValue>> {
    const url = this.buildUrl(keys, ctx);
    try {
      const response = await this.fetchEvaluate(url);
      if (response.status === 304) return this.snapshotFor(keys);
      if (!response.ok) return this.handleNonOk(keys, fallback, response.status);
      return this.handleOk(keys, response, fallback);
    } catch (error) {
      return this.handleNetworkError(keys, fallback, error);
    }
  }

  /**
   * Lê valor em cache sem fazer rede. Útil para evitar flash antes do
   * primeiro evaluate resolver. Retorna `undefined` se nunca avaliado.
   */
  get(key: string): FlagValue | undefined {
    return this.cache.get(key);
  }

  /** Snapshot em memória (somente-leitura). */
  snapshot(): Record<string, FlagValue> {
    return Object.fromEntries(this.cache);
  }

  // ──────────────────────────────────────────────────────────────────────
  // API pública — polling
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Inicia polling a cada `pollIntervalMs`. Faz uma busca imediata.
   * Idempotente: chamadas adicionais reiniciam o timer com novas keys.
   */
  start(keys: string[], ctx: EvaluationContext = {}): void {
    this.currentKeys = keys;
    this.currentCtx = ctx;
    this.stop();

    // Dispara imediatamente (não aguarda tick do setInterval).
    void this.evaluate(keys, ctx);

    this.timer = setInterval(() => {
      void this.evaluate(this.currentKeys, this.currentCtx);
    }, this.pollIntervalMs);
  }

  /** Para o polling. Não limpa cache — sobrevive para uso síncrono. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // API pública — listeners
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Inscreve listener para mudanças de snapshot. Retorna função de unsubscribe.
   */
  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internos — helpers do evaluate (extraídos para reduzir complexidade)
  // ──────────────────────────────────────────────────────────────────────

  private async fetchEvaluate(url: string): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const etag = this.readEtag();
    if (etag) headers['If-None-Match'] = etag;
    return this.fetcher(url, { method: 'GET', headers });
  }

  private async handleOk(
    keys: string[],
    response: Response,
    fallback: Record<string, FlagValue>
  ): Promise<Record<string, FlagValue>> {
    const body = (await response.json()) as Record<string, FlagValue>;
    this.writeEtag(response.headers?.get('ETag'));
    this.mergeCache(keys, body);
    return this.assembleResult(keys, fallback);
  }

  private handleNonOk(
    keys: string[],
    fallback: Record<string, FlagValue>,
    status: number
  ): Record<string, FlagValue> {
    logger.warn('FeatureFlagClient', `Avaliação retornou ${status}; usando fallback.`, { keys });
    return this.applyFallback(keys, fallback);
  }

  private handleNetworkError(
    keys: string[],
    fallback: Record<string, FlagValue>,
    error: unknown
  ): Record<string, FlagValue> {
    logger.warn('FeatureFlagClient', 'Falha de rede; usando fallback.', {
      keys,
      error: error instanceof Error ? error.message : String(error),
    });
    return this.applyFallback(keys, fallback);
  }

  private mergeCache(keys: string[], body: Record<string, FlagValue>): void {
    let changed = false;
    for (const key of keys) {
      if (key in body) {
        const prev = this.cache.get(key);
        const next = body[key];
        if (prev !== next) changed = true;
        this.cache.set(key, next);
      }
    }
    if (changed) this.notifyListeners();
  }

  private assembleResult(
    keys: string[],
    fallback: Record<string, FlagValue>
  ): Record<string, FlagValue> {
    const result: Record<string, FlagValue> = {};
    for (const key of keys) {
      result[key] = this.cache.has(key) ? this.cache.get(key) : fallback[key];
    }
    return result;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internos — utilidades
  // ──────────────────────────────────────────────────────────────────────

  private buildUrl(keys: string[], ctx: EvaluationContext): string {
    const qs = new URLSearchParams({ keys: keys.join(',') });
    if (ctx.restaurantId) qs.set('restaurantId', ctx.restaurantId);
    if (ctx.userId) qs.set('userId', ctx.userId);
    const sep = this.baseUrl.includes('?') ? '&' : '?';
    return `${this.baseUrl}/evaluate${sep}${qs.toString()}`;
  }

  private snapshotFor(keys: string[]): Record<string, FlagValue> {
    const result: Record<string, FlagValue> = {};
    for (const key of keys) {
      if (this.cache.has(key)) result[key] = this.cache.get(key);
    }
    return result;
  }

  private applyFallback(
    keys: string[],
    fallback: Record<string, FlagValue>
  ): Record<string, FlagValue> {
    const result: Record<string, FlagValue> = {};
    for (const key of keys) {
      if (this.cache.has(key)) {
        result[key] = this.cache.get(key);
      } else if (key in fallback) {
        result[key] = fallback[key];
      }
    }
    return result;
  }

  private readEtag(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(this.etagKey);
    } catch {
      return null;
    }
  }

  private writeEtag(etag: string | null): void {
    if (typeof localStorage === 'undefined') return;
    if (!etag) return;
    try {
      localStorage.setItem(this.etagKey, etag);
    } catch {
      // localStorage cheio ou bloqueado — não derruba polling.
    }
  }

  private notifyListeners(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) {
      try {
        listener(snap);
      } catch (error) {
        logger.warn('FeatureFlagClient', 'Listener falhou.', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
