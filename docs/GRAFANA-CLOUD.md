# 📊 Grafana Cloud + k6 Cloud — Setup Guide

**Última atualização:** 06 de julho de 2026

Como configurar observabilidade completa com Grafana Cloud (metrics + logs + traces) e k6 Cloud (load tests distribuidos).

---

## 🎯 Por que Grafana Cloud?

**Tudo em uma plataforma:**
- ✅ **Metrics** (Prometheus) — dashboards de performance
- ✅ **Logs** (Loki) — centralização de logs de todas as fontes
- ✅ **Traces** (Tempo) — OpenTelemetry traces (já configurado no projeto)
- ✅ **k6 Cloud** — load tests distribuidos de múltiplas regiões
- ✅ **Alertas** — Slack, PagerDuty, Email, Webhook

**Free tier:** 10k metrics, 50GB logs, 50GB traces, 50 VUs de k6 Cloud.

---

## 🚀 Setup inicial

### 1. Criar conta no Grafana Cloud

1. Vá em https://grafana.com/products/cloud/
2. Click "Get started for free"
3. Criar stack (`pedi-ai-prod`)
4. Selecionar região (sugestão: `us-east-1` ou `sa-east-1`)
5. Salvar credenciais:
   - **Grafana URL**: `https://pedi-ai-prod.grafana.net`
   - **User**: número (ex: 123456)
   - **API Key**: será gerado

### 2. Coletar credenciais

Após criar stack, vá em **"Connect data"** e anote:

```
PROMETHEUS_URL=https://prometheus-prod-01-prod-us-east-0.grafana.net/api/prom/push
PROMETHEUS_USER=123456
PROMETHEUS_API_KEY=glc_xxx...

LOKI_URL=https://logs-prod-eu-west-0.grafana.net/loki/api/v1/push
LOKI_USER=123456
LOKI_API_KEY=glc_xxx...

TEMPO_URL=https://tempo-prod-01-prod-us-east-0.grafana.net
TEMPO_USER=123456
TEMPO_API_KEY=glc_xxx...
```

### 3. Configurar secrets no GitHub

```bash
# Variáveis (não sensíveis)
GRAFANA_CLOUD_URL=https://pedi-ai-prod.grafana.net

# Secrets
GRAFANA_PROMETHEUS_USER=123456
GRAFANA_PROMETHEUS_API_KEY=glc_xxx...
GRAFANA_LOKI_USER=123456
GRAFANA_LOKI_API_KEY=glc_xxx...
GRAFANA_TEMPO_USER=123456
GRAFANA_TEMPO_API_KEY=glc_xxx...
```

---

## 📊 Metrics (Prometheus)

### Configurar OpenTelemetry Collector

O projeto já tem OpenTelemetry (`@opentelemetry/*` em `apps/api`). Falta exportar pra Grafana Cloud.

**1. Criar `apps/api/src/tracing/otel-collector.ts`:**

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { metrics } from '@opentelemetry/api';

const exporter = new PrometheusExporter({
  endpoint: process.env.OTEL_METRICS_ENDPOINT || '/metrics',
});

// Métricas customizadas
const orderCounter = metrics.createCounter('pedi_orders_total', {
  description: 'Total de pedidos criados',
});

const orderDuration = metrics.createHistogram('pedi_order_duration_seconds', {
  description: 'Tempo de criação do pedido',
});

export { exporter, orderCounter, orderDuration };
```

**2. Atualizar `apps/api/src/tracing/tracing.ts` pra usar o exporter:**

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
// ... resto da config
```

### Métricas recomendadas

| Métrica | Tipo | Labels |
|---|---|---|
| `pedi_orders_total` | Counter | restaurant_id, status |
| `pedi_order_duration_seconds` | Histogram | restaurant_id |
| `pedi_active_users` | Gauge | — |
| `pedi_payment_total` | Counter | method (pix/cartao), status |
| `pedi_payment_value_reais` | Counter | method |
| `pedi_subscription_total` | Counter | plan, status |
| `pedi_db_query_duration_seconds` | Histogram | query_type |
| `pedi_cache_hits_total` | Counter | cache_name |

### Alertas Prometheus sugeridos

```yaml
# api_high_error_rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
  for: 5m
  annotations:
    summary: "Error rate acima de 1%"

# api_slow_response
- alert: SlowResponse
  expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
  for: 5m
  annotations:
    summary: "p95 > 1s"

# db_connection_exhausted
- alert: DBConnectionPool
  expr: db_pool_used / db_pool_total > 0.9
  for: 2m
  annotations:
    summary: "Pool de DB quase esgotado"
```

---

## 📝 Logs (Loki)

### Configurar Promtail/Promtail-like

**Backend (apps/api):** adicionar transport pro Loki:

```typescript
// apps/api/src/common/logger.ts
import pino from 'pino';
import pinoLoki from 'pino-loki';

const transport = pinoLoki({
  host: process.env.LOKI_URL,
  basicAuth: {
    username: process.env.LOKI_USER,
    password: process.env.LOKI_API_KEY,
  },
});

export const logger = pino({ level: 'info' }, transport);
```

**Frontend (apps/web):** não precisa — Sentry já cuida.

### Queries Loki úteis

```logql
# Erros 500 nas últimas 1h
{service="api"} |= "500" | json

# Latência de pagamento PIX
{service="api"} |= "payment" | json | duration > 1

# Logs por restaurante
{service="api", restaurant_id="rest_123"}

# Slow queries Prisma
{service="api"} |= "prisma" | json | duration > 500
```

---

## 🔍 Traces (Tempo)

O projeto JÁ usa OpenTelemetry (`@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`).

Falta só apontar pro Grafana Cloud:

**1. Adicionar OTLP exporter em `apps/api/src/tracing/tracing.ts`:**

```typescript
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const exporter = new OTLPTraceExporter({
  url: `${process.env.TEMPO_URL}/v1/traces`,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${process.env.TEMPO_USER}:${process.env.TEMPO_API_KEY}`).toString('base64')}`,
  },
});
```

**2. Configurar feature flags:**

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo-prod-01-prod-us-east-0.grafana.net
OTEL_EXPORTER_OTLP_HEADERS=authorization=Basic%20xxx
OTEL_SERVICE_NAME=pedi-ai-api
```

### Trace queries úteis

```
# Latência p99 de requests HTTP
traces_http_route_duration{service.name="api", span.kind="server"} | quantile(0.99)

# Trace specific: pedido com ID
trace_id="abc123"

# Erros em traces
traces{status.code="error"}
```

---

## ⚡ k6 Cloud

### Setup

1. Vá em https://app.k6.io/
2. Login com mesma conta Grafana Cloud
3. Copiar **k6 Cloud Token**

```bash
# Login local
k6 login cloud --token <K6_CLOUD_TOKEN>

# Rodar test na cloud
k6 cloud tests/load/landing.js \
  --env BASE_URL=https://pedi.ai \
  --vus 100 \
  --duration 5m
```

### Distributed load (múltiplas regiões)

```bash
# Simula 100 VUs de São Paulo + 100 de NYC + 100 de Frankfurt
k6 cloud tests/load/stress.js \
  --env BASE_URL=https://pedi.ai \
  --vus 300 \
  --duration 10m \
  --execution-allocator "geo:US-East,US-West,EU"
```

### Integração Grafana Cloud

k6 Cloud → Grafana Cloud é nativo (mesma empresa). Dashboards prontos em:
- **Performance Overview** (latência p50/p95/p99)
- **Error Rate**
- **Throughput (req/s)**
- **Virtual Users timeline**

---

## 🎯 Dashboards Grafana sugeridos

### Dashboard 1: PediAI API Overview

**Painéis:**
- Request rate (req/s) por endpoint
- Error rate (5xx) por endpoint
- Latência p50/p95/p99
- Top 10 endpoints mais lentos
- Status codes distribution (pie chart)

### Dashboard 2: Database Performance

- Query duration p95 por tabela
- Slow queries (>500ms)
- Connection pool usage
- Lock waits
- Cache hit rate

### Dashboard 3: Business Metrics

- Pedidos por hora (heatmap)
- Faturamento por dia (graph)
- Ticket médio
- Taxa de conversão (visitantes → pedidos)
- Pedidos por restaurante (top 10)

### Dashboard 4: SaaS Subscription

- MRR (Monthly Recurring Revenue)
- Churn rate
- Trial → Paid conversion
- Active subscriptions
- Revenue by plan

---

## 🚨 Alertas sugeridos

### Críticos (Slack/PagerDuty imediato)

```yaml
- alert: API_Down
  expr: up{job="api"} == 0
  for: 1m
  
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  
- alert: PaymentFailure
  expr: rate(pedi_payment_total{status="failed"}[5m]) > 0.1
  for: 2m
```

### Warning (Slack diário)

```yaml
- alert: SlowAPI
  expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.8
  for: 15m
  
- alert: HighMemory
  expr: process_resident_memory_bytes > 500_000_000
  for: 10m
```

---

## 💰 Custos (estimativa)

| Serviço | Free tier | Pago |
|---|---|---|
| **Grafana Cloud Pro** | 10k metrics + 50GB logs | $8/mês pra 100k metrics + 100GB logs |
| **k6 Cloud** | 50 VUs | $99/mês pra 500 VUs unlimited |
| **Total** | $0/mês (até escalar) | ~$107/mês (early stage) |

**Break-even:** com 3-5 clientes pagantes (R$ 99-199/mês), Grafana Cloud se paga.

---

## 📚 Recursos

- [Grafana Cloud Docs](https://grafana.com/docs/grafana-cloud/)
- [k6 Cloud Docs](https://k6.io/docs/cloud/)
- [OpenTelemetry to Grafana](https://grafana.com/docs/opentelemetry/)
- [PediAI OpenSpec](.openspec/) (configurações atuais)