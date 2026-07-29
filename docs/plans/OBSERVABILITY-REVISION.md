# 📊 Revisão Crítica + Alternativas Open-Source — Observabilidade Pedi-AI

**Branch:** `feature/observability-enhancements`
**Data:** 29 de julho de 2026
**Escopo:** revisão honesta do que foi feito + busca por soluções 100% gratuitas

---

## 🎯 TL;DR

1. **Implementação anterior tinha 6 bugs reais** (versão Fastify errada, deps mortas, serialização incorreta, complexidade excessiva). Já corrigidos nesta revisão.
2. **Plano anterior assumia Grafana Cloud Free + Sentry ($26/mês)** — funciona mas tem custo.
3. **Alternativa 100% OSS gratuita e viável:** **OpenObserve** (single-binary Rust, 20.4k stars, 140× mais barato que Datadog/Elastic) **+ Sentry self-hosted** (grátis mas pesado).
4. **Recomendação ajustada:** OpenObserve self-hosted como primário até ~R$5k MRR; depois migrar para SigNoz Cloud ou Grafana Cloud Pro.

---

## 🐛 Bugs encontrados e corrigidos

### 🔴 P0 — Bloqueavam o PR

| #   | Bug                                                                                                                            | Arquivo                                            | Correção                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | `return503OnClosing: true` em Fastify v5 — opção **removida** nessa versão                                                     | `apps/api/src/main.ts`                             | Substituído por `forceCloseConnections: true` + onClose hook (TODO comentário para implementação futura) |
| 2   | `forceCloseConnections: 'idle'` — em Fastify v5 aceita **boolean**, não string                                                 | `apps/api/src/main.ts`                             | Corrigido para `forceCloseConnections: true`                                                             |
| 3   | `MetricsController.getPrometheusExporter().collect()` — método `collect()` **não existe** na API pública do PrometheusExporter | `apps/api/src/observability/metrics.controller.ts` | Reescrito: usa `MeterProvider` global + `PrometheusSerializer`                                           |
| 4   | `nestjs-pino` adicionado ao package.json mas **nunca importado**                                                               | `apps/api/package.json`                            | Dep removida                                                                                             |
| 5   | `pino-http` adicionado mas **nunca importado**                                                                                 | `apps/api/package.json`                            | Dep removida                                                                                             |
| 6   | `maskPii` aplicado em `Error`/`Date`/`Buffer` no logMethod hook — pode quebrar serialização                                    | `apps/api/src/observability/logger.ts`             | Guard `!(first instanceof Error) && !(first instanceof Date) && !Buffer.isBuffer(first)`                 |

### 🟡 P1 — Técnicos menores

| #   | Item                                                                                                           | Observação                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 7   | Mistura OTel SDK v1 (`sdk-trace-base@1.30.1`) com v2 (`sdk-metrics@2.8.0`)                                     | Proposital — ecosystem em transição. `@opentelemetry/api@1.9.1` aceita ambos. **Documentar como decisão consciente.** |
| 8   | `getPrometheusExporter()` ainda exportado mas não usado pelo controller                                        | Warning lint, não erro. **TODO:** remover quando confirmar que ninguém importa.                                       |
| 9   | `webVitalsReporter` (component) declarado mas `WebVitalsReporter` no `layout.tsx` **NÃO foi conectado no JSX** | Vou consertar agora                                                                                                   |

### 🟢 P2 — Melhorias incrementais

| #   | Item                                                                                               |
| --- | -------------------------------------------------------------------------------------------------- |
| 10  | Testes unitários dos 4 módulos novos ainda não foram escritos (precisa para manter cobertura ≥80%) |
| 11  | Sem validação de `pnpm install && build && test` (precisa rodar)                                   |
| 12  | Plano + runbooks mencionam Sentry SaaS — atualizar para mencionar self-hosted também               |

---

## 🌐 Alternativas Open-Source / Gratuitas (pesquisa real)

### Pesquisa falhou parcialmente

- `delegate_task` com `web_search` falhou: HTTP 401 invalid x-api-key (mesmo padrão das tentativas anteriores)
- **Workaround usado:** navegação direta via `browser_navigate` em sites públicos (signoz.io, github.com)

### Opções viáveis para o pedi-ai

#### 🥇 **OpenObserve** — RECOMENDAÇÃO PRIMÁRIA

| Item                       | Valor                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| URL                        | https://github.com/openobserve/openobserve                                                     |
| Stars                      | **20.4k** (jul/2026)                                                                           |
| Commits                    | 6,705 (commit mais recente: 3 horas antes da consulta)                                         |
| Linguagem                  | **Rust** — single binary deploy                                                                |
| Stack storage              | S3-compatible / local disk (sem ClickHouse, sem Postgres)                                      |
| Funcionalidades            | Logs + Metrics + Traces + Frontend (RUM) + Pipelines + Alerts + Dashboards + LLM observability |
| Setup                      | `docker run` OU single binary OU k8s                                                           |
| Free tier                  | **Até 50 GB/dia ingestão (~1.5 TB/mês)** incluindo uso comercial                               |
| Custo self-hosted          | VPS 4vCPU/8GB RAM (~R$80-150/mês) ou Hetzner dedicated                                         |
| Vantagem vs Datadog/Splunk | "**140× lower storage costs**" (afirmação oficial)                                             |
| OTel nativo                | ✅ Sim — receivers OTLP/HTTP e gRPC                                                            |
| Manutenção                 | Comunidade ativa (commits diários), fundação OpenObserve Inc.                                  |

**Ideal para pedi-ai porque:**

- Substitui Grafana Cloud + Loki + Tempo + Mimir com **1 binário** (sem ClickHouse pesado)
- Frontend monitoring incluído (substitui parcialmente Sentry)
- Free tier cobre até tração inicial sem custo
- OTel native — encaixa direto com a instrumentação já feita na branch

#### 🥈 **SigNoz** — RECOMENDAÇÃO SECUNDÁRIA

| Item              | Valor                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| URL               | https://signoz.io/docs/install/docker/                                                                                               |
| Stack             | OTel Collector + ClickHouse + Query Service + Frontend                                                                               |
| Requisitos Docker | **4GB RAM mínimo** dedicado ao Docker                                                                                                |
| Setup             | `git clone https://github.com/SigNoz/signoz && cd signoz/deploy && docker compose -f docker/clickhouse-setup/docker-compose.yaml up` |
| Free tier         | Open-source MIT (community edition)                                                                                                  |
| OTel nativo       | ✅ Sim — UI é totalmente OTel-native                                                                                                 |
| Alertas           | ✅ Sim — alerts nativos                                                                                                              |
| Comunidade        | 31.7k stars no GitHub                                                                                                                |

**Trade-off vs OpenObserve:** SigNoz é mais "padrão" (muitos tutoriais), usa ClickHouse (storage columnar mais eficiente para séries temporais), MAS exige 4GB RAM só pro Docker e tem mais containers (mais complexo de manter).

#### 🥉 **Grafana Stack self-hosted** — para casos específicos

| Componente       | Função  | RAM                     |
| ---------------- | ------- | ----------------------- |
| Prometheus       | Metrics | ~2GB                    |
| Loki             | Logs    | ~1GB                    |
| Tempo            | Traces  | ~1GB                    |
| Grafana          | UI      | ~500MB                  |
| **Total mínimo** |         | **~4.5GB** só pra stack |

**Trade-off:** cada componente é best-of-breed, mas é 4 serviços pra manter vs 1 binário (OpenObserve).

#### 🏅 **Sentry self-hosted**

| Item         | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| URL          | https://github.com/getsentry/self-hosted                                      |
| Requisitos   | Docker Compose com **mínimo 8GB RAM, 20GB disk**                              |
| Workers      | Relay, Web, Worker, Cron, Snuba consumers, Kafka, ClickHouse, Redis, Postgres |
| Complexidade | **Alta** — 10+ containers                                                     |
| Free tier    | Sim (self-hosted), mas updates manuais + segurança operacional                |

**Veredicto:** Sentry self-hosted é **pesado demais** para o estágio do pedi-ai. Manter Sentry SaaS (até plano Team $26/mês) é mais sensato **enquanto tração baixa**, ou usar o frontend monitoring do OpenObserve.

#### ⚡ **Uptrace** — menção honrosa

| Item          | Valor                                                 |
| ------------- | ----------------------------------------------------- |
| URL           | https://uptrace.dev/                                  |
| Stack         | OTel + ClickHouse + single binary                     |
| Open-source   | Sim (AGPL)                                            |
| Manutenção    | Comunidade menor, releases menos frequentes           |
| **Veredicto** | Funcional mas comunidade menor que OpenObserve/SigNoz |

---

## 📊 Tabela comparativa final

| Critério           | OpenObserve          | SigNoz                         | Grafana Stack          | Sentry Self-Host          |
| ------------------ | -------------------- | ------------------------------ | ---------------------- | ------------------------- |
| Setup difficulty   | ⭐⭐ (single binary) | ⭐⭐⭐ (docker-compose grande) | ⭐⭐⭐⭐ (4+ serviços) | ⭐⭐⭐⭐⭐ (10+ serviços) |
| RAM mínima         | ~2GB                 | 4GB                            | 4.5GB                  | 8GB                       |
| Logs               | ✅                   | ✅                             | ✅ Loki                | ✅                        |
| Metrics            | ✅                   | ✅                             | ✅ Prom                | ⚠️ limit                  |
| Traces             | ✅                   | ✅                             | ✅ Tempo               | ✅                        |
| Frontend/RUM       | ✅                   | ⚠️ limit                       | ❌                     | ✅                        |
| Alertas            | ✅                   | ✅                             | ✅ Grafana             | ✅                        |
| OTel nativo        | ✅                   | ✅                             | ✅                     | ⚠️ bridge                 |
| Storage tech       | S3/disk              | ClickHouse                     | TSDB/Blob              | ClickHouse                |
| Comunidade 2026    | 🟢 muito ativa       | 🟢 muito ativa                 | 🟢 gigante             | 🟢 grande                 |
| Custo mensal (VPS) | ~R$80                | ~R$120                         | ~R$150                 | ~R$200+                   |

---

## 🎯 Recomendação ajustada para pedi-ai

### Curto prazo (MRR < R$5k) — AGORA

**OpenObserve self-hosted** num VPS Hetzner (4vCPU/8GB RAM, ~R$80/mês).

Setup:

```bash
# VPS Ubuntu 22.04
docker run -d \
  --name openobserve \
  -p 5080:5080 \
  -v /var/lib/openobserve:/data \
  -e ZO_ROOT_USER_EMAIL=admin@pedi-ai.com \
  -e ZO_ROOT_USER_PASSWORD='SENHA_FORTE' \
  public.ecr.aws/zinclabs/openobserve:latest
```

Apontar a API:

```bash
# .env (apps/api)
OTEL_EXPORTER_OTLP_ENDPOINT=http://observability.pedi-ai.internal:5080/api/v1/otlp
OTEL_METRICS_EXPORTER=otlp
LOKI_URL=  # não precisa — OpenObserve aceita OTel logs
```

**Custo total: R$80/mês** (vs R$26 Sentry + Grafana Cloud Free = R$26 mas com vendor lock-in e 10k métricas limit).

### Médio prazo (MRR R$5k-30k)

Migrar para **OpenObserve Cloud** (50GB/dia free ou plano Pro) ou **SigNoz Cloud** ($0.04/GB ingest). Mantém self-host só se ops tiver capacidade.

### Longo prazo (MRR > R$30k)

Considerar **Datadog/Honeycomb** se o time crescer e ops virar especializado. Grafana Cloud Pro como middle ground.

---

## ✅ Checklist pós-revisão

- [x] Remover `nestjs-pino` (dep morta)
- [x] Remover `pino-http` (dep morta)
- [x] Corrigir `return503OnClosing` → `forceCloseConnections: true` (Fastify v5)
- [x] Corrigir `forceCloseConnections: 'idle'` → `forceCloseConnections: true` (boolean)
- [x] Reescrever `MetricsController` para usar `PrometheusSerializer` via `MeterProvider` global
- [x] Guardar `maskPii` contra `Error`/`Date`/`Buffer`
- [x] Atualizar `OBSERVABILITY.md` com alternativa OpenObserve/SigNoz
- [ ] Conectar `<WebVitalsReporter />` no JSX do `layout.tsx`
- [ ] Adicionar testes unitários dos 4 módulos novos (logger, metrics, tracing, controller)
- [ ] Atualizar `OBSERVABILITY.md` para mencionar OpenObserve como opção primária
- [ ] Validar `pnpm install && pnpm build && pnpm test`
- [ ] Adicionar `infrastructure/docker-compose.openobserve.yml` (template)
- [ ] Documentar `OTEL_EXPORTER_OTLP_ENDPOINT` para OpenObserve no `.env.example`

---

## 📝 Decisões a confirmar com o time

1. **Self-host OpenObserve agora** (R$80/mês) ou **Grafana Cloud Free + Sentry Team** (R$26/mês)?
   - Prós OpenObserve: tudo-em-um, sem vendor lock-in, 140× storage cost
   - Prós Grafana+Sentry: zero setup inicial, mais tempo pra focar no produto
2. **Migrar ClickHouse** se um dia precisar? Não — OpenObserve usa S3/disk próprio, mais simples.
3. **Sentry frontend monitoring** vs OpenObserve RUM?
   - OpenObserve RUM: integrado, sem custo extra
   - Sentry: replay de sessão (LGPD-sensitive), source maps, error grouping melhor
