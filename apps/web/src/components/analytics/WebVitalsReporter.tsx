'use client';

/**
 * Web Vitals Reporter — envia Core Web Vitals para o backend.
 *
 * **Por que reportar ao backend e não só para analytics?**
 * - Permite correlacionar métricas de UX (LCP, CLS) com latência de
 *   servidor (TTFB) via mesmo `trace_id` — identificar se lentidão é
 *   cliente ou servidor.
 * - Permite alertar quando p75 LCP degrada (ex: regressão de bundle).
 * - Mantém Sentry/browser-side como fallback de erro.
 *
 * **Endpoint:** `POST /api/web/vitals` (Next.js API route)
 * **Privacy:** nenhum PII coletado. Apenas métricas agregadas.
 *
 * **Thresholds Google (2024+):**
 * - LCP (Largest Contentful Paint): < 2.5s = good, > 4.0s = poor
 * - INP (Interaction to Next Paint): < 200ms = good, > 500ms = poor
 *   → Substituiu FID em 2024.
 * - CLS (Cumulative Layout Shift): < 0.1 = good, > 0.25 = poor
 * - FCP (First Contentful Paint): < 1.8s = good, > 3.0s = poor
 * - TTFB (Time to First Byte): < 800ms = good, > 1800ms = poor
 *
 * **Padrão de implementação:** `next/web-vitals` (wrapper oficial Next.js
 * sobre `web-vitals` do GoogleChrome — já instalado via Next).
 *
 * Auditoria origem: OBSERVABILITY.md § P0.4 (frontend metrics).
 */

import { useReportWebVitals } from 'next/web-vitals';

const VITALS_ENDPOINT = '/api/web/vitals';

type VitalMetric = {
  id: string;
  name: string;
  value: number;
  startTime?: number;
  attribution?: Record<string, unknown>;
  label?: 'web-vital' | 'custom';
};

/** Envia métrica individual para o backend (fire-and-forget). */
function sendMetric(metric: VitalMetric): void {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    url: typeof window !== 'undefined' ? window.location.pathname : undefined,
    startTime: metric.startTime,
  });

  // Usa sendBeacon quando disponível (sobrevive a unload, melhor pra TTFB/LCP finais)
  // caso contrário usa fetch keepalive.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(VITALS_ENDPOINT, blob);
      if (sent) return;
    } catch {
      // cai pra fetch abaixo
    }
  }

  if (typeof fetch !== 'undefined') {
    fetch(VITALS_ENDPOINT, {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // silencioso — métricas não devem quebrar UX
    });
  }
}

export function WebVitalsReporter(): null {
  useReportWebVitals(sendMetric as Parameters<typeof useReportWebVitals>[0]);
  return null;
}

export default WebVitalsReporter;
