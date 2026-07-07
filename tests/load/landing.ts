/**
 * k6 Load Test — Landing Page (TypeScript)
 *
 * Ver `landing.js` para documentação completa.
 *
 * Rodar: `k6 run tests/load/landing.ts --compatibility-mode=experimental_enhanced`
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');
const lcpProxy = new Trend('lcp_proxy');

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

export default function (): void {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/`, {
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

  if (!success) errorRate.add(1);

  sleep(Math.random() * 5 + 3);

  if (Math.random() > 0.5) {
    const r1 = http.get(`${BASE_URL}/register`);
    check(r1, {
      'register page 200': (r) => r.status === 200,
      'register has email input': (r) => (r.body as string).includes('type="email"'),
    }) || errorRate.add(1);
    sleep(Math.random() * 3 + 2);
  }

  if (Math.random() > 0.7) {
    const r2 = http.get(`${BASE_URL}/termos`);
    check(r2, { 'termos 200': (r) => r.status === 200 }) || errorRate.add(1);
    sleep(Math.random() * 4 + 2);
  }

  if (Math.random() > 0.8) {
    const r3 = http.get(`${BASE_URL}/privacidade`);
    check(r3, { 'privacidade 200': (r) => r.status === 200 }) || errorRate.add(1);
  }
}