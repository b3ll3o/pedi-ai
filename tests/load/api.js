/**
 * k6 Load Test — API Endpoints (50 VUs, 5min)
 *
 * Simula tráfego realista nos endpoints públicos da API:
 * - GET /health (health check monitoring)
 * - GET /restaurants (listagem pública de restaurantes — se houver)
 * - GET /categories/:id (categorias de cardápio)
 * - GET /products/:id (produtos)
 * - POST /auth/login (com credenciais fixas — rate limit test)
 *
 * **Cenário:**
 * - Ramp up: 0→50 VUs em 1min
 * - Steady: 50 VUs durante 3min
 * - Ramp down: 50→0 em 1min
 * - Total: 5 minutos
 *
 * **Thresholds:**
 * - p95 < 500ms (API deve ser rápida)
 * - p99 < 1s
 * - Erros < 2% (tolerância maior pq inclui 401 de login inválido)
 *
 * **Como rodar:**
 * ```bash
 * k6 run \
 *   --env API_URL=https://api.pedi.ai \
 *   tests/load/api.js
 * ```
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'http://localhost:3001';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  // 1. Health check (50% das requests — comum em monitoramento)
  if (Math.random() > 0.5) {
    const response = http.get(`${API_URL}/health`);
    check(response, {
      'health 200': (r) => r.status === 200,
      'health JSON': (r) => {
        try {
          return JSON.parse(r.body as string).status === 'ok';
        } catch {
          return false;
        }
      },
      'health TTFB < 200ms': (r) => r.timings.waiting < 200,
    }) || errorRate.add(1);
  }

  sleep(0.5);

  // 2. Listagem de categorias (cardápio público)
  const restaurantId = 'rest_seed';
  let response = http.get(`${API_URL}/restaurants/${restaurantId}/categories`);
  check(response, {
    'categories 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 3. Listagem de produtos
  response = http.get(`${API_URL}/restaurants/${restaurantId}/products`);
  check(response, {
    'products 200': (r) => r.status === 200,
    'products is array': (r) => {
      try {
        const data = JSON.parse(r.body as string);
        return Array.isArray(data);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // 4. Login attempt (rate-limitado, retorna 401 legítimo)
  response = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email: 'fake@test.com', senha: 'wrongpass' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(response, {
    'login 401 (creds inválidas)': (r) => r.status === 401,
    'login < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(2);

  // 5. Cardápio público (rota que clientes acessam)
  response = http.get(`${API_URL}/menu?restaurantId=${restaurantId}`);
  check(response, {
    'menu 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1.5);
}