# ⚠️ Runbook: p95 latency elevado

**Severidade:** P1 (degrada UX, não bloqueia venda)
**SLO afetado:** latency (p95 < 500ms)

## Sintomas

- Alert `ApiHighP95Latency` (p95 > 500ms por 10min)
- Usuários vendo loading lento no checkout
- Time de suporte reportando "app travando"

## Diagnóstico (10 min)

### 1. Qual rota está lenta?

Grafana → Dashboard `pedi-api-latency` → Top routes por p95:

- `POST /orders` (criar pedido)?
- `GET /menu` (cardápio)?
- `POST /payments/pix` (gerar PIX)?
- `GET /health/*` (health checks — não conta!)

### 2. Decompor: API vs DB vs externos

Verificar métrica por categoria:

```promql
# DB query duration
histogram_quantile(0.95, sum by (le) (rate(pedi_db_query_duration_seconds_bucket[5m])))

# External API (MercadoPago, Asaas) — aproximado via duração total - DB
```

### 3. Traces específicos (slow sampling)

No Grafana Tempo → filtrar `duration > 1s` ordenado por duration desc:

- Identificar span gargalo (DB? external? compute?)
- Conferir query Prisma via span attributes `db.statement`

### 4. Connection pool do DB

```bash
psql -c "SELECT count(*), state FROM pg_stat_activity WHERE datname='pedi_ai' GROUP BY state"
```

- `idle`: conexões ociosas (normal)
- `active`: conexões em uso (> 80% do pool = problema)
- `idle in transaction`: bug de código que esqueceu de fazer COMMIT

### 5. Redis / BullMQ

```bash
redis-cli info stats | grep instantaneous
redis-cli slowlog get 10
```

## Ações por causa

### Query Prisma lenta

```bash
# Identificar query via Prisma log
grep "prisma:query" /var/log/pedi-ai-api/*.log | awk '{print $NF}' | sort | uniq -c | sort -rn | head -10
```

Top queries lentas → criar índice no schema Prisma:

```prisma
model Order {
  restaurantId String
  createdAt    DateTime
  @@index([restaurantId, createdAt])  // ← adicionar
}
```

Após `prisma migrate dev` + redeploy.

### Pool de DB exausto

```bash
# Aumentar pool size temporariamente
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=10"
systemctl restart pedi-ai-api
```

### Redis lento

- Conferir `redis-cli --latency` — se > 5ms, problema de rede
- Upgrade do plano Redis (mais memória / conexão)

### MercadoPago / Asaas lento

- Não é nosso — verificar `/status.mercadopago.com`
- Adicionar circuit breaker se não tiver:
  ```ts
  // Pseudocódigo
  if (circuitBreaker.isOpen('mercadopago')) return cachedResponse;
  ```

### Cold start do app (após deploy)

- Normal primeiros 2-3min após restart
- Se persiste > 10min → investigar memory leak

## Pós-mortem (se > 30min)

- Latência degrada conversão: 100ms = -7% conversion (Akamai study)
- Documentar causa + fix
- Adicionar regression test se foi regressão de código
