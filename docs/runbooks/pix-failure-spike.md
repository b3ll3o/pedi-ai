# 🚨 Runbook: Pico de falhas PIX

**Severidade:** P0 (afeta receita direta)
**SLO afetado:** pix_success (98%)

## Sintomas

- Alert `PixFailureSpike` (>10% falhas em 5min) **OU** `PixFailureSustained` (>2% em 1h)
- Clientes vendo pagamento "expirado" / QR code não funcionando
- Dashboard Asaas/MercadoPago mostrando queda

## Diagnóstico (3 min)

### 1. Status do PSP

- **MercadoPago**: https://www.mercadopago.com.br/status (ou /developers/panel)
- **Asaas**: https://status.asaas.com/

### 2. Taxa real vs reportada

```logql
{service="pedi-ai-api"} |= "pedi.payment" | json
| rate_over_time(5m)
```

### 3. Webhook está chegando?

```sql
SELECT
  DATE_TRUNC('minute', "createdAt") AS minuto,
  COUNT(*) AS eventos
FROM "WebhookEvent"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
  AND "eventType" = 'payment'
GROUP BY 1
ORDER BY 1 DESC;
```

Se a taxa de webhook é **menor** que o normal → PSP não está entregando.

### 4. Dedupe de webhook?

```sql
SELECT COUNT(*), "eventId"
FROM "WebhookEvent"
WHERE "createdAt" > NOW() - INTERVAL '10 minutes'
GROUP BY 2
HAVING COUNT(*) > 1;
```

Se houver duplicatas com mesmo `eventId` → bug no handler de webhook (`handleWebhookInternal`).

### 5. Erro específico nas métricas

```bash
curl -s localhost:9090/metrics | grep pedi_payments_pix_failed_total
```

Olhar label `reason` — `webhook_handler_error`, `mp_404`, `signature_invalid`, etc.

## Ações por causa

### PSP em incidente (MercadoPago)

- **Não fazer rollback de código** — não é bug nosso
- Comunicar clientes via banner no app ("PIX temporariamente instável, use cartão")
- Monitorar /status.mercadopago.com a cada 5min

### Webhook duplicado em loop

```sql
-- Identificar eventId problemático
SELECT "eventId", COUNT(*), MIN("createdAt"), MAX("createdAt")
FROM "WebhookEvent"
WHERE "createdAt" > NOW() - INTERVAL '10 minutes'
GROUP BY 1
HAVING COUNT(*) > 5;
```

```bash
# Investigar logs do eventId
grep "eventId problemático" /var/log/pedi-ai-api/*.log
```

### Assinatura HMAC do webhook falhando

```bash
# Validar manualmente
node -e '
const crypto = require("crypto");
const secret = process.env.MP_WEBHOOK_SECRET;
const payload = require("fs").readFileSync("/tmp/webhook-body.json", "utf8");
const header = "v1=...";
const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
console.log("expected:", "v1=" + hash);
console.log("got:     ", header);
'
```

Se divergem → chave MP_WEBHOOK_SECRET rotacionada no MP, atualizar .env + restart.

### Token expirado

```bash
# Verificar validade do access token
curl -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN" \
  https://api.mercadopago.com/v1/payments/search?limit=1
```

Se 401 → token expirado. Rotacionar via MercadoPago dashboard.

## Pós-mortem

- PIX é a **principal fonte de receita** — qualquer outage > 30min vira post-mortem P0
- Documentar tempo de detecção vs tempo de resolução
- Se bug em código: fix + regression test
- Se PSP: adicionar retry/backoff se não tiver
