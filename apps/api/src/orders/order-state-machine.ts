import { OrderStatus } from '@prisma/client';

/**
 * Auditoria ACHADO-31 (Re-varredura 6): state-machine compartilhada.
 *
 * Antes: `OrdersService.isValidStatusTransition` (orders.service.ts) e
 * `PaymentsService.isValidOrderTransition` (payments.service.ts) eram duas
 * funções com semânticas divergentes:
 *   - A de orders conhece TODAS as transições permitidas (paid → preparing,
 *     preparing → ready, etc).
 *   - A de payments só conhece 3 transições (pending_payment → paid/cancelled).
 *
 * Risco: se um dev atualizar a state-machine de orders (ex: adicionar
 * `cancelled` como estado final em vez de acessível de qualquer estado) sem
 * sincronizar payments, o webhook pode continuar aplicando regra antiga.
 *
 * Solução: uma única tabela de transições em `OrderStateMachine.canTransition`.
 * Tanto `OrdersService.updateStatus` quanto `PaymentsService.handleWebhook`
 * consomem essa fonte única. O webhook usa apenas o subconjunto
 * `webhookTransitions` (escopo MP: pending_payment → paid/cancelled).
 *
 * Esta função é **pura** (sem dependências) — fácil de testar e usar em
 * ambos os services.
 */

type OrderStatusTransition = { from: OrderStatus; to: OrderStatus };

/**
 * Tabela canônica de transições válidas. Single source of truth.
 */
const VALID_TRANSITIONS: readonly OrderStatusTransition[] = [
  // pending_payment → paid (webhook PIX) ou cancelled
  { from: 'pending_payment', to: 'paid' },
  { from: 'pending_payment', to: 'cancelled' },
  // paid → preparing (staff inicia preparo) ou cancelled
  { from: 'paid', to: 'preparing' },
  { from: 'paid', to: 'cancelled' },
  // preparing → ready (staff finaliza) ou cancelled
  { from: 'preparing', to: 'ready' },
  { from: 'preparing', to: 'cancelled' },
  // ready → delivered (entrega) ou cancelled (desistência tardia)
  { from: 'ready', to: 'delivered' },
  { from: 'ready', to: 'cancelled' },
  // delivered e cancelled são estados finais (sem transições)
];

/**
 * Verifica se a transição `from → to` é permitida pela state-machine
 * canônica. Retas idênticas (from === to) são consideradas válidas para
 * idempotência (re-salvar mesmo status).
 */
export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/**
 * Subconjunto de transições que o webhook do Mercado Pago pode forçar.
 * O webhook só atua no ciclo de pagamento (`pending_payment → paid/cancelled`).
 * Para outras transições (preparing → ready, etc), apenas o staff via
 * PATCH /orders/:id/status tem autoridade.
 */
export const WEBHOOK_ALLOWED_TRANSITIONS: ReadonlySet<string> = new Set([
  'pending_payment->paid',
  'pending_payment->cancelled',
]);

/**
 * Verifica se a transição é válida **e** autorizada para o contexto de webhook.
 * Usado por `PaymentsService.handleWebhook`.
 */
export function isValidWebhookTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return WEBHOOK_ALLOWED_TRANSITIONS.has(`${from}->${to}`);
}

/**
 * Lista todas as transições válidas (útil para testes e debug).
 */
export function listValidTransitions(): readonly OrderStatusTransition[] {
  return VALID_TRANSITIONS;
}
