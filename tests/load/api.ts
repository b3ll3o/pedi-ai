/**
 * k6 Load Test — API Endpoints (TypeScript)
 *
 * Ver `api.js` para documentação completa.
 *
 * Rodar: `k6 run tests/load/api.ts --compatibility-mode=experimental_enhanced`
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

export default function (): void {
  if (Math.random() > 0.5) {
    const r = http.get(`${API_URL}/health`);
    check(r, {
      'health 200': (res) => res.status === 200,
      'health JSON': (res) => {
        try {
          return JSON.parse(res.body as string).status === 'ok';
        } catch {
          return false;
        }
      },
      'health TTFB < 200ms': (res) => res.timings.waiting < 200,
    }) || errorRate.add(1);
  }

  sleep(0.5);

  const restaurantId = 'rest_seed';
  const r1 = http.get(`${API_URL}/restaurants/${restaurantId}/categories`);
  check(r1, { 'categories 200': (res) => res.status === 200 }) || errorRate.add(1);

  sleep(1);

  const r2 = http.get(`${API_URL}/restaurants/${restaurantId}/products`);
  check(r2, {
    'products 200': (res) => res.status === 200,
    'products is array': (res) => {
      try {
        const data = JSON.parse(res.body as string);
        return Array.isArray(data);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  const r3 = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({ email: 'fake@test.com', senha: 'wrongpass' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(r3, {
    'login 401 (creds inválidas)': (res) => res.status === 401,
    'login < 500ms': (res) => res.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(2);

  const r4 = http.get(`${API_URL}/menu?restaurantId=${restaurantId}`);
  check(r4, { 'menu 200': (res) => res.status === 200 }) || errorRate.add(1);

  sleep(1.5);
}