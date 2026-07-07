'use client';

/**
 * Plausible Analytics Component (LGPD-friendly)
 *
 * **POR QUE PLAUSIBLE?**
 * - Não usa cookies (LGPD-compliant by default, sem precisar de banner).
 * - Dados agregados, sem PII.
 * - Self-hosted ou cloud (cloud: plausible.io, grátis até 10k eventos/mês).
 * - Não bloqueia rendering (script async defer).
 *
 * **Ativação:**
 * - Em produção + `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` configurado → carrega script.
 * - Em dev ou sem domínio configurado → no-op.
 *
 * **Eventos customizados:**
 * Use a função global `window.plausible('event_name', { props })`.
 * Pra tipagem, declare eventos em `apps/web/src/types/plausible.d.ts`.
 *
 * **LGPD:**
 * Plausible NÃO coleta IP, fingerprint, cookies. Conforme orientação da
 * ANPD (Autoridade Nacional de Proteção de Dados), Plausible é dispensado
 * de consentimento prévio para analytics agregados.
 *
 * Referência: https://plausible.io/data-policy
 */

import Script from 'next/script';

import type { PlausibleConfig } from '@/types/plausible';

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const IS_PROD = NODE_ENV === 'production';

export interface PlausibleAnalyticsProps {
  /**
   * Domínio customizado do Plausible (ex.: `pedi.ai`).
   * Se omitido, usa env var `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
   */
  domain?: string;
  /**
   * API host do Plausible. Default: `https://plausible.io`.
   * Para self-hosted: `https://plausible.seu-dominio.com`.
   */
  apiHost?: string;
  /**
   * Se true, ignora completamente (não carrega script). Útil pra testes.
   */
  disabled?: boolean;
}

export function PlausibleAnalytics({
  domain,
  apiHost = 'https://plausible.io',
  disabled = false,
}: PlausibleAnalyticsProps = {}) {
  const effectiveDomain = domain ?? PLAUSIBLE_DOMAIN;

  // No-op em dev, sem domínio configurado ou se disabled.
  if (!IS_PROD || !effectiveDomain || disabled) {
    return null;
  }

  // Script oficial do Plausible.
  // `data-domain` permite múltiplos sites no mesmo Plausible instance.
  return (
    <Script
      defer
      data-domain={effectiveDomain}
      src={`${apiHost}/js/script.js`}
      strategy="afterInteractive"
    />
  );
}

/**
 * Helper: dispara evento customizado do Plausible.
 *
 * @example
 * ```ts
 * trackEvent('signup_completed', { plan: 'monthly' });
 * trackEvent('order_paid', { value: 4990, currency: 'BRL' });
 * ```
 *
 * Funciona em client-side. Em SSR, é no-op.
 */
export function trackEvent(eventName: string, props?: PlausibleConfig['props']) {
  if (typeof window === 'undefined') return;
  const plausible = (window as unknown as { plausible?: PlausibleConfig }).plausible;
  if (typeof plausible === 'function') {
    plausible(eventName, { props });
  }
}