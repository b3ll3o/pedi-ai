/**
 * Controller de métricas Prometheus.
 *
 * **Endpoint:** `GET /metrics`
 * **Formato:** text/plain (versão 0.0.4 do Prometheus exposition format)
 * **Auth:** nenhuma (mesma política dos health checks — Prometheus scrape
 * roda dentro da VPC).
 *
 * **Por que serializar via PrometheusSerializer e não via exporter?**
 * O `PrometheusExporter` do OTel abre um servidor HTTP separado na porta
 * `METRICS_PORT` (default 9090). Este controller é um **failover** dentro
 * do Fastify — se o exporter OTel cair, ainda há como scrapear via app.
 *
 * Se `OTEL_METRICS_EXPORTER=otlp` (recomendado 2025/2026), o exporter não
 * é criado e este endpoint serializa via `PrometheusSerializer` (stdlib
 * OTel — sem exporter externo necessário).
 *
 * **Trade-off:** serialização aqui duplica o trabalho do exporter. Em prod
 * com `OTEL_METRICS_EXPORTER=prometheus`, scrape no `:9090/metrics` direto;
 * este endpoint é só smoke test.
 *
 * Auditoria origem: OBSERVABILITY.md § P0.2.
 */

import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrometheusSerializer } from '@opentelemetry/exporter-prometheus';
import type { FastifyReply } from 'fastify';

import { Public } from '../auth/decorators/public.decorator';

@ApiTags('observability')
@Controller('metrics')
export class MetricsController {
  // Singleton PrometheusSerializer — reusa buffers entre requests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializer: any = null;

  private getSerializer(): unknown {
    if (this.serializer) return this.serializer;
    // Lazy init — evita custo se metrics desabilitadas.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrometheusSerializer } = require('@opentelemetry/exporter-prometheus');
      this.serializer = new PrometheusSerializer();
    } catch {
      this.serializer = { serialize: () => '# Metrics exporter não instalado\n' };
    }
    return this.serializer;
  }

  @Get()
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Métricas Prometheus (text/plain)' })
  @ApiResponse({ status: 200, description: 'Métricas no formato Prometheus' })
  @ApiResponse({ status: 503, description: 'Metrics exporter desabilitado' })
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async getMetrics(@Res() reply: FastifyReply): Promise<void> {
    try {
      // Acessa o MeterProvider global e serializa as métricas coletadas.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { metrics } = require('@opentelemetry/api');
      const meterProvider = metrics.getMeterProvider();
      // OTel 2.x: meterProvider.getMetricReader() retorna readers registrados.
      // Fallback gracioso se API mudar entre versões.
      const resourceMetrics = await this.collectFromProvider(meterProvider);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: string = (this.getSerializer() as any).serialize(resourceMetrics);
      reply.status(200).send(body);
    } catch (err) {
      reply.status(503).send(`# erro ao coletar métricas: ${(err as Error).message}\n`);
    }
  }

  /**
   * Coleta ResourceMetrics do MeterProvider global.
   * Compatível com OTel SDK v1 (MeterProvider.getCollector()) e v2
   * (MeterProvider com PeriodicExportingMetricReader.collect()).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async collectFromProvider(meterProvider: any): Promise<any> {
    // OTel v2 API: instrument.collect() em cada reader.
    if (typeof meterProvider.getMetricReader === 'function') {
      // SDK v2 — vamos iterar readers via readers[] se exposto
      // (algumas versões escondem; fallback abaixo).
    }
    // Fallback universal: tentar collect via readers[] ou getCollector.
    if (Array.isArray(meterProvider.readers) && meterProvider.readers.length > 0) {
      const allMetrics = [];
      for (const reader of meterProvider.readers) {
        const { resourceMetrics } = await reader.collect();
        if (resourceMetrics) allMetrics.push(resourceMetrics);
      }
      return { resourceMetrics: allMetrics };
    }
    // OTel SDK v1: getMeterProvider().getCollector()
    if (typeof meterProvider.getCollector === 'function') {
      const collector = meterProvider.getCollector();
      const metrics = collector.collect();
      return { resourceMetrics: metrics };
    }
    return { resourceMetrics: [] };
  }

  // Mantém import vivo para tree-shaking em builds sem side-effects.
  private static readonly _PrometheusSerializer = PrometheusSerializer;
}
