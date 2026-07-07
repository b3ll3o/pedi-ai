/**
 * k6 Load Test — Landing Page (100 VUs, 5min)
 *
 * Simula tráfego realista na landing page:
 * - Usuários chegam, leem conteúdo, clicam em CTAs
 * - Mix de device types (desktop + mobile)
 * - Navegação multi-página (landing → termos → privacidade)
 *
 * **Cenário:**
 * - Ramp up: 0→100 VUs em 1min
 * - Steady: 100 VUs durante 3min
 * - Ramp down: 100→0 em 1min
 * - Total: 5 minutos
 *
 * **Thresholds (passa se):**
 * - p95 < 1.5s
 * - p99 < 3s
 * - Erros < 1%
 *
 * **Como rodar:**
 * ```bash
 * k6 run \
 *   --env BASE_URL=https://pedi.ai \
 *   tests/load/landing.js
 * ```
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');
const lcpProxy = new Trend('lcp_proxy'); // Time to first byte + DOM ready

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    lcp_proxy: ['p(95)<2000'],
  },
};

export default function () {
  // 1. Homepage (cold cache first hit, depois warm)
  const start = Date.now();
  let response = http.get(`${BASE_URL}/`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'User-Agent': 'k6-load-test/1.0',
    },
  });
  lcpProxy.add(Date.now() - start);

  const success = check(response, {
    'homepage status 200': (r) => r.status === 200,
    'homepage content-type html': (r) => (r.headers['Content-Type'] ?? '').includes('text/html'),
    'homepage TTFB < 500ms': (r) => r.timings.waiting < 500,
    'homepage has H1': (r) => {
      const body = r.body as string;
      return body.includes('<h1');
    },
    'homepage size < 500KB': (r) => r.body.length < 500_000,
  });

  if (!success) {
    errorRate.add(1);
  }

  // Think time: simula leitura (3-8s)
  sleep(Math.random() * 5 + 3);

  // 2. CTA "Começar Grátis" → /register (não vamos submeter, só navegar)
  if (Math.random() > 0.5) {
    // 50% clicam no CTA
    response = http.get(`${BASE_URL}/register`);
    check(response, {
      'register page 200': (r) => r.status === 200,
      'register has email input': (r) => (r.body as string).includes('type="email"'),
    }) || errorRate.add(1);
    sleep(Math.random() * 3 + 2);
  }

  // 3. Footer link → /termos (30% clicam)
  if (Math.random() > 0.7) {
    response = http.get(`${BASE_URL}/termos`);
    check(response, {
      'termos 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    sleep(Math.random() * 4 + 2);
  }

  // 4. Privacy (20% navegam)
  if (Math.random() > 0.8) {
    response = http.get(`${BASE_URL}/privacidade`);
    check(response, {
      'privacidade 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  }
}