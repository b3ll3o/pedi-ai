/**
 * k6 Load Test — Smoke
 *
 * **Quando rodar:**
 * - Smoke rápido após deploy (1 minuto)
 * - Validação inicial de smoke em staging
 *
 * **Cenário:**
 * - 10 VUs (usuários virtuais) durante 1 minuto
 * - Ramp up: 0→10 em 10s
 * - Ramp down: 10→0 em 10s
 * - Total: ~80 segundos
 *
 * **Thresholds (passa se):**
 * - p95 < 1s
 * - p99 < 2s
 * - Erros < 1%
 *
 * **Como rodar:**
 * ```bash
 * k6 run \
 *   --env BASE_URL=https://pedi.ai \
 *   tests/load/smoke.js
 * ```
 *
 * Pré-requisitos:
 * ```bash
 * # Instalar k6
 * # macOS: brew install k6
 * # Linux: sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
 * #        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
 * #        sudo apt-get update && sudo apt-get install k6
 * ```
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp up 0→10
    { duration: '1m', target: 10 }, // Steady 10 VUs
    { duration: '10s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  // 1. Homepage
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'homepage status 200': (r) => r.status === 200,
    'homepage TTFB < 500ms': (r) => r.timings.waiting < 500,
  }) || errorRate.add(1);

  sleep(1);

  // 2. API health
  response = http.get(`${BASE_URL}/health`);
  check(response, {
    'api health 200': (r) => r.status === 200,
    'api health JSON': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return body.status === 'ok';
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // 3. Termos
  response = http.get(`${BASE_URL}/termos`);
  check(response, {
    'termos status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}