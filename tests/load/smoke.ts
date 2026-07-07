/**
 * k6 Load Test — Smoke (TypeScript)
 *
 * Ver `smoke.js` para documentação completa.
 *
 * Rodar: `k6 run tests/load/smoke.ts --compatibility-mode=experimental_enhanced`
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
  },
};

export default function (): void {
  const response1 = http.get(`${BASE_URL}/`);
  check(response1, {
    'homepage status 200': (r) => r.status === 200,
    'homepage TTFB < 500ms': (r) => r.timings.waiting < 500,
  }) || errorRate.add(1);

  sleep(1);

  const response2 = http.get(`${BASE_URL}/health`);
  check(response2, {
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

  const response3 = http.get(`${BASE_URL}/termos`);
  check(response3, {
    'termos status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}