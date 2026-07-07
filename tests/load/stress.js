/**
 * k6 Load Test — Stress Test (300 VUs, 10min)
 *
 * **OBJETIVO:** Encontrar o breaking point da aplicação.
 *
 * **Cenário:**
 * - Ramp up agressivo: 0→300 VUs em 3min
 * - Steady: 300 VUs durante 5min
 * - Ramp down: 300→0 em 2min
 * - Total: 10 minutos
 *
 * **Quando rodar:**
 * - Antes de black friday / eventos de pico
 * - Trimestralmente pra validar capacidade
 * - Após mudanças significativas de infra
 *
 * **Thresholds (NÃO devem passar — usamos pra encontrar limites):**
 * - p95 < 3s (warning, não failure)
 * - p99 < 5s
 * - Erros < 10% (tolerância alta — queremos ver onde quebra)
 *
 * **Como rodar:**
 * ```bash
 * k6 run \
 *   --env BASE_URL=https://staging.pedi.ai \
 *   --env API_URL=https://staging-api.pedi.ai \
 *   tests/load/stress.js
 *
 * # Gerar relatório HTML
 * k6 run --out json=results.json tests/load/stress.js
 * ```
 *
 * ⚠️ **NÃO RODAR EM PRODUÇÃO** sem aviso. Use staging ou fora do horário.
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
    { duration: '3m', target: 300 }, // Ramp up agressivo
    { duration: '5m', target: 300 }, // Steady 300 VUs
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    // Thresholds mais lenientes — objetivo é ENCONTRAR o breaking point
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'], // Até 10% de erro é aceitável em stress
  },
  // Configuração avançada
  noConnectionReuse: false,
  userAgent: 'k6-stress-test/1.0',
};

export default function () {
  // Simula jornada completa de um cliente

  // 1. Homepage
  const start = Date.now();
  let response = http.get(`${BASE_URL}/`);
  ttfbTrend.add(Date.now() - start);

  const homepageOk = check(response, {
    'homepage 200': (r) => r.status === 200,
    'homepage TTFB < 2s': (r) => r.timings.waiting < 2000,
  });

  if (homepageOk) successfulRequests.add(1);
  else errorRate.add(1);

  // Não dorme muito (cenário stress = alta concorrência)
  sleep(Math.random() * 2);

  // 2. Cardápio público (rota mais pesada — puxa produtos)
  response = http.get(`${BASE_URL}/menu`);
  check(response, {
    'menu 200': (r) => r.status === 200,
    'menu has products': (r) => (r.body as string).includes('product'),
  }) || errorRate.add(1);

  sleep(Math.random() * 1.5 + 0.5);

  // 3. API menu (JSON endpoint)
  response = http.get(`${API_URL}/products`);
  check(response, {
    'api products 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1);

  // 4. Simula criação de pedido (POST pesado — exige DB write)
  if (Math.random() > 0.7) {
    // 30% tentam fazer pedido
    const orderData = JSON.stringify({
      restaurantId: 'rest_seed',
      customerId: `cust_${__VU}_${__ITER}`,
      items: [
        { productId: 'prod_seed_1', quantity: 1, price: 79.9 },
      ],
      total: 79.9,
      paymentMethod: 'pix',
    });

    response = http.post(`${API_URL}/orders`, orderData, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(response, {
      'order created (201) or auth required (401)': (r) => [201, 401, 400].includes(r.status),
    }) || errorRate.add(1);
  }

  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/stress-summary.json': JSON.stringify(data, null, 2),
  };
}

// Helper: text summary
function textSummary(data: any, options: any): string {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  const lines = [
    '',
    '═'.repeat(70),
    `${indent}STRESS TEST SUMMARY`,
    '═'.repeat(70),
    '',
    `${indent}VUs max:           ${data.metrics.vus_max?.values?.max || 0}`,
    `${indent}Requests:          ${data.metrics.http_reqs?.values?.count || 0}`,
    `${indent}Failed requests:   ${data.metrics.http_req_failed?.values?.passes || 0} (${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%)`,
    `${indent}Duration p95:      ${((data.metrics.http_req_duration?.values?.['p(95)'] || 0)).toFixed(0)}ms`,
    `${indent}Duration p99:      ${((data.metrics.http_req_duration?.values?.['p(99)'] || 0)).toFixed(0)}ms`,
    `${indent}TTFB p95:          ${((data.metrics.ttfb?.values?.['p(95)'] || 0)).toFixed(0)}ms`,
    `${indent}Successful:        ${data.metrics.successful_requests?.values?.count || 0}`,
    `${indent}Errors:            ${data.metrics.errors?.values?.passes || 0}`,
    '',
    '═'.repeat(70),
  ];

  return lines.join('\n');
}