# 🚀 CI/CD — Guia Completo

**Última atualização:** 06 de julho de 2026

Documentação dos workflows de GitHub Actions, secrets necessários e como configurar.

---

## 📋 Workflows disponíveis

| Workflow | Trigger | O que faz |
|---|---|---|
| `ci.yml` | PR + push master | Lint, type-check, testes unitários, testes integração |
| `e2e.yml` | PR + push master | Testes E2E completos (precisa DB) |
| `deploy-vps.yml` | push master | Deploy automatizado na VPS via SSH |
| **`e2e-production.yml`** ← NOVO | workflow_run + schedule + manual | Smoke E2E em produção |
| **`load-tests.yml`** ← NOVO | schedule + manual + workflow_run | k6 load tests |

---

## 🔐 Secrets necessários

Configure em **Settings → Secrets and variables → Actions**:

### Obrigatórios (já devem existir)

| Secret | Uso |
|---|---|
| `VPS_HOST` | IP/host da VPS |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Chave SSH privada |

### Para E2E Production (novo)

| Secret | Uso | Obrigatório? |
|---|---|---|
| `PROD_BASE_URL` | URL de produção (default: `https://pedi.ai`) | Opcional |
| `PROD_API_URL` | URL da API em produção | Opcional |

> **Dica:** Configure como **Variables** (não Secrets) se não forem sensíveis. Vá em "Variables" ao invés de "Secrets".

### Para Load Tests (novo)

Nenhum secret adicional necessário — os testes usam URLs públicas.

### Para notificações (opcional)

| Secret | Uso |
|---|---|
| `SLACK_WEBHOOK_URL` | Notificar falhas de produção no Slack |
| `ALERT_EMAIL` | Email pra alertas críticos |

---

## 🎯 Como rodar

### E2E Production (smoke pós-deploy)

```bash
# Automático: roda após cada deploy-vps.yml completar
# Manual: GitHub Actions UI → "🚀 E2E Production" → Run workflow
# Diário: 6h UTC (cron)
```

### Load Tests

```bash
# Automático: semanal (domingo 2h UTC)
# Manual: GitHub Actions UI → "🧪 Load Tests" → Run workflow
#   Escolher: tipo (smoke/landing/api/stress) + ambiente (staging/prod)
```

**Exemplos de uso manual:**

```
🔹 Smoke em staging (recomendado pós-feature):
   Type: smoke | Env: staging

🔹 Stress em staging (encontrar breaking point):
   Type: stress | Env: staging

🔹 Landing em prod (verificar após deploy grande):
   Type: landing | Env: production
```

---

## 📊 Interpretação de resultados

### E2E Production falha

```yaml
1. Verifique artefatos do run:
   - playwright-report-prod/
   - playwright-results-prod.json
   - smoke-output.log
   - health-output.log

2. Categorize o problema:
   - Falha de rota pública: usually fix em 5-10min (deploy novo)
   - Falha de health check: investigar DB/Redis
   - Falha de SSL: verificar certificado
   - Falha de headers: verificar config Vercel/Nginx

3. Decida:
   - Regressão simples: hotfix + redeploy
   - DB/Redis down: rollback IMEDIATO
   - Performance degradada: investigar e planejar fix
```

### Load Test falha (thresholds)

```yaml
1. Identifique qual threshold falhou:
   - p95 muito alto: otimizar query lenta, adicionar cache, scale up
   - Erro rate alto: rate limiting, circuit breaker, scale up
   - p99 crítico: outlier em algum endpoint específico

2. Compare com run anterior (artifact):
   - Regressão vs baseline histórico?
   - É trend de piora ou spike pontual?

3. Ação:
   - Regressão < 20%: monitorar (pode ser variação normal)
   - Regressão 20-50%: investigar e planejar fix
   - Regressão > 50%: URGENTE — rollback ou fix imediato
```

---

## 🔄 Fluxo end-to-end de um deploy

```
[1] Developer abre PR
    │
    ↓
[2] ci.yml roda (lint + type-check + testes unit)
    │ - falha? bloqueia merge
    ↓
[3] e2e.yml roda (testes E2E completos)
    │ - falha? bloqueia merge
    ↓
[4] PR mergeada em master
    ↓
[5] deploy-vps.yml dispara
    │ - build + push + SSH deploy
    ↓
[6] e2e-production.yml dispara (workflow_run)
    │ - roda smoke tests contra prod
    │ - falha? cria issue "Production E2E Smoke falhou"
    │         + alerta "ROLLBACK IMEDIATO"
    ↓
[7] load-tests.yml roda semanalmente (domingo)
    │ - detecta regressões de performance
```

---

## 📈 Métricas de CI/CD (DORA)

Acompanhe estas métricas pra avaliar saúde do pipeline:

| Métrica | Meta | Como medir |
|---|---|---|
| **Lead Time** | < 1 dia | Tempo entre commit e produção |
| **Deploy Frequency** | > 5/semana | Número de deploys por semana |
| **Change Failure Rate** | < 15% | % de deploys que quebram produção |
| **MTTR** | < 1 hora | Tempo médio pra rollback |

---

## ⚠️ Troubleshooting

### Workflow não disparou

```yaml
1. Verifique triggers em on: (workflow_dispatch, schedule, workflow_run)
2. Se schedule, GitHub pode demorar até 15min pra rodar
3. workflow_run só funciona em workflows do MESMO repositório
```

### k6 não instala

```bash
# Adicionar step de debug
- name: Debug k6 install
  run: |
    sudo apt-get update
    sudo apt-cache search k6
    cat /etc/apt/sources.list.d/k6.list
```

### Smoke test flake (passa às vezes, falha às vezes)

```yaml
1. Verificar retry policy do Playwright config
2. Considerar aumentar timeouts:
   timeout: 90_000
   expect: { timeout: 15_000 }
3. Identificar testes flaky com --retries=2
4. Marcar testes flaky com tag @flaky e excluir de critical
```

### Deploy rollback não funciona

```bash
1. Verificar SSH key ainda válida
2. Verificar que servidor tem espaço em disco
3. Checar logs do step "Deploy to VPS"
4. Rollback manual: SSH + git checkout HEAD~1 + pnpm build
```

---

## 📚 Próximos passos sugeridos

- [ ] Adicionar notificação Slack em falhas críticas
- [ ] Configurar GitHub Environments (production, staging)
- [ ] Adicionar cache de pnpm (`cache: 'pnpm'`)
- [ ] Configurar Dependabot pra updates automáticos
- [ ] Adicionar visual regression (Percy/Chromatic)
- [ ] Adicionar security scanning (Snyk, CodeQL)
- [ ] Métricas DORA automatizadas (Datadog/Grafana)
- [ ] Status page público (Instatus) linkado em README