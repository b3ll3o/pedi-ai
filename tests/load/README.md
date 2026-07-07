# 🧪 Testes de Carga (k6) — PediAI

**Última atualização:** 06 de julho de 2026

Suite de testes de carga e stress usando [k6](https://k6.io/) (Grafana).

---

## 📦 Scripts disponíveis

| Script | VUs | Duração | Threshold p95 | Caso de uso |
|---|---|---|---|---|
| `smoke.js` | 10 | ~1 min | < 1s | Smoke rápido pós-deploy |
| `landing.js` | 100 | ~5 min | < 1.5s | Validar capacidade da landing |
| `api.js` | 50 | ~5 min | < 500ms | Validar endpoints da API |
| `stress.js` | 300 | ~10 min | < 3s | Encontrar breaking point |

**Versões TypeScript (.ts)** também disponíveis (mesmos scripts, type-safe).

---

## 🚀 Instalação do k6

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker (alternativa)
docker pull grafana/k6
```

---

## ▶️ Como rodar

### Smoke (recomendado pós-deploy)

```bash
# Produção
BASE_URL=https://pedi.ai k6 run tests/load/smoke.js

# Staging
BASE_URL=https://staging.pedi.ai k6 run tests/load/smoke.js
```

### Landing (validação de capacidade)

```bash
BASE_URL=https://pedi.ai k6 run tests/load/landing.js
```

### API

```bash
API_URL=https://api.pedi.ai k6 run tests/load/api.js
```

### Stress (encontra breaking point)

```bash
# ⚠️ NÃO RODAR EM PRODUÇÃO sem aviso
# Use staging ou fora do horário
BASE_URL=https://staging.pedi.ai \
API_URL=https://staging-api.pedi.ai \
k6 run tests/load/stress.js

# Salvar relatório
k6 run --out json=tests/load/results/stress.json tests/load/stress.js
```

### TypeScript (type-safe)

```bash
k6 run tests/load/smoke.ts --compatibility-mode=experimental_enhanced
```

---

## 📊 Interpretando resultados

### Output típico

```
     ✓ home status 200
     ✓ api health JSON
     ✓ home TTFB < 500ms

   checks.........................: 100.00% ✓ 1200   ✗ 0
   data_received..................: 1.2 MB  20 kB/s
   data_sent......................: 320 kB  5.3 kB/s
   http_req_blocked...............: avg=1.2ms    min=0s       med=0s       max=120ms   p(90)=2ms
   http_req_connecting............: avg=2.5ms    min=0s       med=0s       max=80ms    p(90)=5ms
   http_req_duration..............: avg=145.2ms  min=80ms     med=130ms    max=450ms   p(90)=220ms p(95)=280ms
     { expected_response:true }...: avg=145.2ms  min=80ms     med=130ms    max=450ms   p(90)=220ms p(95)=280ms
   http_req_failed................: 0.00%  ✓ 0     ✗ 600
   http_req_receiving.............: avg=0.5ms    min=0s       med=0s       max=12ms    p(90)=1ms
   http_req_sending...............: avg=0.1ms    min=0s       med=0s       max=2ms     p(90)=0s
   http_req_tls_handshaking.......: avg=80ms     min=0s       med=0s       max=200ms   p(90)=150ms
   http_req_waiting...............: avg=144.5ms  min=80ms     med=130ms    max=440ms   p(90)=220ms p(95)=280ms
   http_reqs......................: 600     10/s
   iteration_duration.............: avg=1.14s    min=1.1s     med=1.14s    max=1.3s    p(90)=1.2s   p(95)=1.25s
   iterations.....................: 200     3.33/s
   vus............................: 10     min=10        max=10
   vus_max........................: 10     min=10        max=10
```

### Métricas-chave

| Métrica | Bom | Atenção | Crítico |
|---|---|---|---|
| **p95 duration** | < 1s | 1-2s | > 2s |
| **p99 duration** | < 2s | 2-3s | > 3s |
| **Error rate** | < 1% | 1-5% | > 5% |
| **HTTP reqs/sec** | depende do cenário | — | — |
| **TTFB p95** | < 300ms | 300-500ms | > 500ms |

### Thresholds definidos

Cada script tem thresholds. Se algum falhar, k6 exit code != 0 (CI pode falhar build):

```bash
# Verificar exit code
k6 run tests/load/landing.js
echo $?  # 0 = sucesso, 99 = falha
```

---

## 🎯 Thresholds por script

### `smoke.js`
```js
thresholds: {
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  http_req_failed: ['rate<0.01'],
  errors: ['rate<0.05'],
}
```

### `landing.js`
```js
thresholds: {
  http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  http_req_failed: ['rate<0.01'],
  errors: ['rate<0.05'],
  lcp_proxy: ['p(95)<2000'], // LCP proxy < 2s
}
```

### `api.js`
```js
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.02'],
  errors: ['rate<0.05'],
}
```

### `stress.js`
```js
thresholds: {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'], // leniente
  http_req_failed: ['rate<0.10'],
}
```

---

## 🔄 CI/CD

### GitHub Actions

```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * 0' # Todo domingo 2h da manhã
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run smoke test
        run: |
          BASE_URL=https://pedi.ai k6 run tests/load/smoke.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-smoke-results
          path: tests/load/results/
```

### Cron job (alternativa simples)

```bash
# /etc/cron.d/pedi-ai-load-tests
0 2 * * 0 cd /app && BASE_URL=https://pedi.ai k6 run tests/load/smoke.js >> /var/log/k6.log 2>&1
```

---

## 📈 Resultados esperados

### Smoke (10 VUs, 1min)
- ~600 requests
- p95 < 1s
- 0% erro
- Throughput: ~10 req/s

### Landing (100 VUs, 5min)
- ~30k requests
- p95 < 1.5s
- Throughput: ~100 req/s
- Pages rendered: ~10k

### API (50 VUs, 5min)
- ~10k requests
- p95 < 500ms
- DB queries: ~5k
- Cache hit rate: > 80%

### Stress (300 VUs, 10min)
- ~100k requests
- p95 < 3s (objetivo é encontrar onde quebra)
- Throughput: ~150 req/s
- Erro aceitável até 10%

---

## 🐛 Debugging

### Ver request/response detalhado

```bash
k6 run --http-debug tests/load/smoke.js
```

### Modo verbose

```bash
k6 run --verbose tests/load/smoke.js
```

### Salvar resultado

```bash
k6 run --out json=results.json tests/load/landing.js
# Depois converte pra HTML:
k6 report results.json
```

### Cloud (Grafana Cloud)

```bash
k6 login cloud
k6 run --out cloud tests/load/stress.js
# Dashboard: https://app.k6.io/
```

---

## 📚 Próximos testes sugeridos

1. **Spike test** — súbito aumento de tráfego (lançamento, black friday)
2. **Soak test** — 100 VUs durante 1h+ (vazamentos de memória)
3. **WebSocket test** — KDS em tempo real com muitos pedidos
4. **Database stress** — pgbench em paralelo
5. **Mobile throttling** — simular 3G, latência alta
6. **Geographic distribution** — usar k6 cloud pra testar de várias regiões

---

## 📖 Referências

- [k6 Docs](https://k6.io/docs/)
- [k6 TypeScript](https://k6.io/docs/using-k6/typescript/)
- [Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [Scenarios](https://k6.io/docs/using-k6/scenarios/)