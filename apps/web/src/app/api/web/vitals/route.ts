/**
 * API route para receber Web Vitals do frontend.
 *
 * Recebe POST com { name, value, id, url } e emite log estruturado que
 * é coletado pelo pino → Loki/OpenObserve. Não persiste em DB para
 * evitar hot-path de disco em sessões anônimas.
 *
 * **Por que não persistir diretamente?**
 * - Volume alto (todo page load gera 5+ métricas).
 * - Já temos logger que vai pra Loki/OpenObserve.
 * - Loki indexa melhor séries temporais que um Postgres.
 *
 * **Segurança:**
 * - Sem auth (métricas são públicas — não carregam PII).
 * - Rate limit via middleware global.
 * - Validação de payload com Zod (rejeita tipos errados).
 *
 * Auditoria origem: OBSERVABILITY.md § P0.4.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { serverLog } from '@/lib/logger.server';

const VitalNameSchema = z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'FID']);

const VitalPayloadSchema = z.object({
  name: VitalNameSchema,
  value: z.number().finite().nonnegative(),
  id: z.string().min(1).max(128),
  url: z.string().max(512).optional(),
  startTime: z.number().finite().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const text = await request.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const parsed = VitalPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      await serverLog('warn', 'WebVitals', 'payload inválido', {
        issues: parsed.error.issues,
      });
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const vital = parsed.data;
    const threshold = getThreshold(vital.name);
    const rating: 'good' | 'needs-improvement' | 'poor' =
      vital.value <= threshold.good
        ? 'good'
        : vital.value <= threshold.poor
          ? 'needs-improvement'
          : 'poor';

    await serverLog('info', 'WebVitals', `web-vital ${vital.name}`, {
      metric: vital.name,
      value: vital.value,
      rating,
      url: vital.url,
      vitalId: vital.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    await serverLog('error', 'WebVitals', 'falha ao processar vital', {
      err: (err as Error).message,
    });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

type Threshold = { good: number; poor: number };

function getThreshold(name: z.infer<typeof VitalNameSchema>): Threshold {
  // Thresholds Google 2024+ (Core Web Vitals).
  switch (name) {
    case 'LCP':
      return { good: 2500, poor: 4000 };
    case 'INP':
      return { good: 200, poor: 500 };
    case 'CLS':
      return { good: 0.1, poor: 0.25 };
    case 'FCP':
      return { good: 1800, poor: 3000 };
    case 'TTFB':
      return { good: 800, poor: 1800 };
    case 'FID':
      // FID é deprecated em favor de INP desde 2024, mas mantemos threshold.
      return { good: 100, poor: 300 };
  }
}
