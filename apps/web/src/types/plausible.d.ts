/**
 * Type augmentation para Plausible custom events.
 *
 * Permite tipar `window.plausible('event_name', { props: { ... } })` em
 * TypeScript pra evitar typos em nome de eventos.
 *
 * Documentação: https://plausible.io/docs/custom-event-goals
 *
 * Para adicionar novo evento customizado:
 * 1. Adicionar entrada em `PlausibleEvents` com `name` + `props` (opcional).
 * 2. Usar `trackEvent('event_name', { ...props })` no código.
 */

export interface PlausibleProps {
  /** Plano de assinatura (monthly | annual). */
  plan?: 'monthly' | 'annual' | 'trial';
  /** Valor em centavos. */
  value?: number;
  /** Moeda ISO 4217 (ex.: BRL). */
  currency?: 'BRL' | 'USD';
  /** ID do restaurante. */
  restaurantId?: string;
  /** ID do pedido. */
  orderId?: string;
  /** Método de pagamento (pix | cartao | dinheiro). */
  paymentMethod?: 'pix' | 'cartao' | 'dinheiro';
  /** Etapa do onboarding (ex.: 'created_restaurant', 'added_product'). */
  onboardingStep?: string;
}

export interface PlausibleEventSpec {
  /** Nome do evento (lowercase, snake_case). */
  name: string;
  /** Props opcionais que o evento carrega. */
  props?: keyof PlausibleProps | (keyof PlausibleProps)[];
}

/**
 * Lista de eventos customizados do PediAI.
 * Adicionar aqui conforme for implementando features.
 */
export const PlausibleEvents = {
  // ── Funil de signup / onboarding ─────────────────────
  signupStarted: { name: 'signup_started' },
  signupCompleted: { name: 'signup_completed', props: ['plan'] as (keyof PlausibleProps)[] },
  trialStarted: { name: 'trial_started', props: ['plan'] as (keyof PlausibleProps)[] },

  // ── Pedido / pagamento ──────────────────────────────
  orderCreated: {
    name: 'order_created',
    props: ['restaurantId', 'orderId', 'value', 'currency'] as (keyof PlausibleProps)[],
  },
  orderPaid: {
    name: 'order_paid',
    props: ['restaurantId', 'orderId', 'value', 'paymentMethod'] as (keyof PlausibleProps)[],
  },
  orderFailed: {
    name: 'order_failed',
    props: ['restaurantId', 'orderId', 'paymentMethod'] as (keyof PlausibleProps)[],
  },

  // ── Onboarding wizard ───────────────────────────────
  onboardingStep: {
    name: 'onboarding_step',
    props: ['onboardingStep'] as (keyof PlausibleProps)[],
  },
  onboardingCompleted: { name: 'onboarding_completed' },

  // ── Billing SaaS ────────────────────────────────────
  checkoutStarted: { name: 'checkout_started', props: ['plan'] as (keyof PlausibleProps)[] },
  subscriptionActivated: {
    name: 'subscription_activated',
    props: ['plan', 'value', 'currency'] as (keyof PlausibleProps)[],
  },
  subscriptionCancelled: { name: 'subscription_cancelled', props: ['plan'] as (keyof PlausibleProps)[] },

  // ── Erros (cruzado com Sentry) ──────────────────────
  clientError: { name: 'client_error' },
} as const;

export type PlausibleEventName = (typeof PlausibleEvents)[keyof typeof PlausibleEvents]['name'];

export interface PlausibleConfig {
  /** Função `plausible()` exposta pelo script do Plausible. */
  plausible?: (event: string, options?: { props?: PlausibleProps }) => void;
}