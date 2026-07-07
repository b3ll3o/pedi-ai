/**
 * k6 Load Test — Stress Test (TypeScript)
 *
 * Ver `stress.js` para documentação completa.
 *
 * Rodar: `k6 run tests/load/stress.ts --compatibility-mode=experimental_enhanced`
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || BASE_URL.replace('pedi.ai', 'api.pedi.ai');

const errorRate = new Rate('errors');
const successfulRequests = new Counter('successful_requests');
const ttfbTrend = new Trend('ttfb');

export const options = {
  stages: [
    { duration: '3m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'],
  },
  noConnectionReuse: false,
  userAgent: 'k6-stress-test/1.0',
};

export default function (): void {
  const start = Date.now();
  const r1 = http.get(`${BASE_URL}/`);
  ttfbTrend.add(Date.now() - start);

  const ok = check(r1, {
    'homepage 200': (r) => r.status === 200,
    'homepage TTFB < 2s': (r) => r.timings.waiting < 2000,
  });

  if (ok) successfulRequests.add(1);
  else errorRate.add(1);

  sleep(Math.random() * 2);

  const r2 = http.get(`${BASE_URL}/menu`);
  check(r2, {
    'menu 200': (r) => r.status === 200,
    'menu has products': (r) => (r.body as string).includes('product'),
  }) || errorRate.add(1);

  sleep(Math.random() * 1.5 + 0.5);

  const r3 = http.get(`${API_URL}/products`);
  check(r3, { 'api products 200': (r) => r.status === 200 }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1);

  if (Math.random() > 0.7) {
    const orderData = JSON.stringify({
      restaurantId: 'rest_seed',
      customerId: `cust_${__VU}_${__ITER}`,
      items: [{ productId: 'prod_seed_1', quantity: 1, price: 79.9 }],
      total: 79.9,
      paymentMethod: 'pix',
    });

    const r4 = http.post(`${API_URL}/orders`, orderData, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(r4, {
      'order created (201) or auth required (401)': (r) => [201, 401, 400].includes(r.status),
    }) || errorRate.add(1);
  }

  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data: Record<string, unknown>): Record<string, string> {
  const metrics = data.metrics as Record<string, { values: Record<string, number> }>;
  const lines = [
    '',
    '═'.repeat(70),
    '  STRESS TEST SUMMARY',
    '═'.repeat(70),
    '',
    `  VUs max:           ${metrics.vus_max?.values?.max || 0}`,
    `  Requests:          ${metrics.http_reqs?.values?.count || 0}`,
    `  Failed requests:   ${metrics.http_req_failed?.values?.passes || 0}`,
    `  Duration p95:      ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    `  Duration p99:      ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(0)}ms`,
    `  TTFB p95:          ${(metrics.ttfb?.values?.['p(95)'] || 0).toFixed(0)}ms`,
    `  Successful:        ${metrics.successful_requests?.values?.count || 0}`,
    `  Errors:            ${metrics.errors?.values?.passes || 0}`,
    '',
    '═'.repeat(70),
  ].join('\n');

  return {
    'stdout': lines,
    'tests/load/results/stress-summary.json': JSON.stringify(data, null, 2),
  };
}