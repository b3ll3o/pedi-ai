# 🚨 Runbook: API Down / Alta taxa de erro

**Severidade:** P0 (página imediato em horário comercial; phone tree fora)
**SLO afetado:** availability (99.9% / 30d)

## Sintomas

- Alert `ApiAvailabilityFastBurn` (burn rate 14.4× budget em 1h)
- Grafana: error rate > 10% em janela 5min
- Usuários relatando 500 / falha no checkout
- Sentry spike de exceções

## Diagnóstico (5 min)

### 1. Confirmar escopo

```bash
# Status do pod / processo
systemctl status pedi-ai-api
pm2 list  # se usando PM2
docker ps | grep pedi-ai-api

# Health checks
curl -s https://api.pedi-ai.com/livez
curl -s https://api.pedi-ai.com/readyz
curl -s https://api.pedi-ai.com/health/db
curl -s https://api.pedi-ai.com/health/redis
```

### 2. Verificar dependências externas

- **Postgres**: `SELECT 1` via psql — funciona? Latência < 100ms?
- **Redis**: `redis-cli ping` → `PONG`?
- **MercadoPago**: https://status.mercadopago.com/ — em incidente?
- **Asaas**: dashboard asaas status

### 3. Logs estruturados (Loki)

```logql
{service="pedi-ai-api", level="error"} | json | __error__=""
| line_format "{{.message}}"
```

Filtrar por `trace_id` específico do report do cliente:

```logql
{service="pedi-ai-api"} | json | trace_id="abc123"
```

### 4. Traces recentes (Tempo)

- Filtrar por `status.code="error"` nos últimos 30min
- Identificar span que falha primeiro (raiz do problema)
- Conferir attributes (restaurant_id, order_id, etc)

## Ações por causa

### DB indisponível

```bash
# Checar conexões Prisma
psql -c "SELECT count(*) FROM pg_stat_activity"

# Reiniciar API (vai re-poolar conexões)
systemctl restart pedi-ai-api
```

### Redis caiu

- Verificar `redis-cli ping`
- Filas entram em modo no-op automaticamente (`pingRedis` retorna null)
- API continua funcionando — investigar por que Redis caiu

### Bug em código (deploy recente)

```bash
git log --oneline -10
# Rollback
git revert HEAD
systemctl restart pedi-ai-api
```

### Webhook MercadoPago em loop

- Verificar `WebhookEvent` table: `SELECT count(*), eventType FROM "WebhookEvent" WHERE createdAt > NOW() - INTERVAL '10 min' GROUP BY 2`
- Se > 1000 entradas/min → evento duplicado em loop, desabilitar rota webhook temporariamente

## Pós-mortem (24h)

1. Criar issue de incident no GitHub
2. Preencher template `/docs/incidents/YYYY-MM-DD.md`
3. Identificar ação preventiva (ex: circuit breaker no webhook)
4. Atualizar este runbook se houver lacuna
