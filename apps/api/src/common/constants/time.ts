/**
 * Constantes de tempo centralizadas (auditoria ACHADO-N31 a N34, Re-varredura 9).
 *
 * Por que centralizar?
 * - Magic numbers espalhados (`24 * 60 * 60 * 1000`, `30 * 60 * 1000`) são
 *   difíceis de auditar em refactorings.
 * - Constantes nomeadas permitem busca semântica (`grep IDEMPOTENCY_KEY_TTL_MS`).
 * - Cleanup jobs e TTLs de criação ficam no mesmo arquivo — fácil auditar
 *   que criação e retenção estão alinhadas.
 */

/** TTL de 1 hora para token de password reset. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/** TTL de 30 minutos para PIX intent (alinhado com janela BR Code). */
export const PIX_INTENT_TTL_MS = 30 * 60 * 1000;

/**
 * TTL de 24h para `IdempotencyKey`.
 *
 * Cleanup: `cleanup.queue.ts` remove chaves expiradas diariamente. Janela
 * de 24h é mais que suficiente para retries do cliente após falha de rede,
 * sem inflar a tabela indefinidamente.
 */
export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Tolerância de skew de relógio para webhook do Mercado Pago.
 * 2 minutos = sweet spot entre tolerar drift legítimo do MP e minimizar
 * janela de replay.
 */
export const MP_WEBHOOK_SKEW_TOLERANCE_MS = 2 * 60 * 1000;
