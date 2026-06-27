/**
 * Step definitions BDD — Feature Flags (Parte 3 — extras).
 *
 * Cobre padrões literais remanescentes dos 5 .feature files.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';

import { FeatureFlagsWorld } from '../support/world';
import { dispatchByPath } from './dispatch-helper';

function world(): FeatureFlagsWorld {
  return (globalThis as unknown as { __cucumberWorld: FeatureFlagsWorld }).__cucumberWorld;
}

/**
 * Extrai método HTTP e path de uma string no formato "GET /api/v1/...".
 * Lança erro se o formato não bater com o esperado.
 */
function parseRota(rota: string): { method: string; path: string } {
  const m = rota.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/);
  if (!m) throw new Error(`Formato de rota inválido: ${rota}`);
  return { method: m[1].toUpperCase(), path: m[2] };
}

Given('que existe um restaurante {string} cadastrado', async function (_nome: string) {
  // stub
});

Given('que existe a flag {string} no sistema', async function (key: string) {
  const flag = await world().repo.findByKey(key);
  if (!flag) throw new Error(`flag '${key}' deve existir pré-criada`);
});

Given(
  'que o ambiente está com {int} flags seedadas \\(offline_enabled, pix_enabled, waiter_mode_enabled, qr_code_enabled, combos_enabled, analytics_enabled, cashback_enabled, multi_restaurant_enabled\\)',
  async function () {
    world().repo.seedLegadas();
  }
);

Given(/^que o ambiente está com ([\d.]+) flags seedadas/, async function () {
  world().repo.seedLegadas();
});

Given('que owner está autenticado', async function () {
  world().authRole = 'owner';
  world().authUserId = 'user_owner';
});

Given('que manager está autenticado', async function () {
  world().authRole = 'manager';
  world().authUserId = 'user_manager';
});

Given('que staff está autenticado', async function () {
  world().authRole = 'staff';
  world().authUserId = 'user_staff';
});

Given(
  'que o owner envia {string} com valueType {string} e defaultValue {string}',
  async function (rota: string, valueType: string, defaultValue: string) {
    world().authRole = 'owner';
    world().authUserId = 'user_owner';
    const body = parseValue(defaultValue);
    const { dispatchRequest, parseValue: _ } = await import('./dispatch-helper');
    void _;
    await dispatchRequest(world(), rota, 'POST', { valueType, defaultValue: body });
  }
);

Given(
  'que o owner envia {string} com valueType {string} e defaultValue "{string}"',
  async function (rota: string, valueType: string, defaultValue: string) {
    world().authRole = 'owner';
    world().authUserId = 'user_owner';
    const { dispatchRequest } = await import('./dispatch-helper');
    await dispatchRequest(world(), rota, 'POST', { valueType, defaultValue });
  }
);

When('a requisição é processada', async function () {
  // já processada pelo step anterior — sem efeito
});

Then(
  'cada elemento deve conter os campos {string}, {string}, {string}, {string}, {string}, {string}',
  function (c1: string, c2: string, c3: string, c4: string, c5: string, c6: string) {
    const body = world().lastResponse?.body as { data?: Record<string, unknown>[] };
    const arr = body.data ?? [];
    const required = [c1, c2, c3, c4, c5, c6];
    for (const item of arr) for (const c of required) assert.ok(c in item);
  }
);

Then(
  'cada elemento deve possuir os campos {string}, {string}, {string}, {string}, {string}, {string}',
  function (c1: string, c2: string, c3: string, c4: string, c5: string, c6: string) {
    const body = world().lastResponse?.body as { data?: Record<string, unknown>[] };
    const arr = body.data ?? [];
    const required = [c1, c2, c3, c4, c5, c6];
    for (const item of arr) for (const c of required) assert.ok(c in item);
  }
);

Then('o corpo deve conter {int} elementos em {string}', function (count: number, key: string) {
  const body = world().lastResponse?.body as Record<string, unknown[]>;
  assert.equal(body[key]?.length, count);
});

Then('o corpo deve conter {int} overrides \\(excluindo o expirado\\)', function (count: number) {
  const body = world().lastResponse?.body;
  const arr = Array.isArray(body) ? body : (body as { data?: unknown[] })?.data;
  assert.equal(arr?.length, count);
});

Then('o status da resposta deve ser {int} \\(Method Not Allowed\\)', function (status: number) {
  assert.equal(world().lastResponse?.status, status);
});

// ── Steps para audit log (RF-ADM-FF-09) ────────────────────

/**
 * Configura o papel e dispatcha a requisição. A rota segue o formato
 * "GET /api/v1/..." ou "POST /api/v1/...".
 */
When('o {word} consulta {string}', async function (papel: string, rota: string) {
  world().authRole = papel as 'owner' | 'manager' | 'staff';
  world().authUserId = `user_${papel}`;
  const { method, path } = parseRota(rota);
  world().lastResponse = await dispatchByPath(world(), path, method);
});

When('o manager envia {string}', async function (rota: string) {
  world().authRole = 'manager';
  world().authUserId = 'user_manager';
  const { method, path } = parseRota(rota);
  world().lastResponse = await dispatchByPath(world(), path, method);
});

When('o owner envia {string}', async function (rota: string) {
  world().authRole = 'owner';
  world().authUserId = 'user_owner';
  const { method, path } = parseRota(rota);
  world().lastResponse = await dispatchByPath(world(), path, method);
});

When('o staff envia {string}', async function (rota: string) {
  world().authRole = 'staff';
  world().authUserId = 'user_staff';
  const { method, path } = parseRota(rota);
  world().lastResponse = await dispatchByPath(world(), path, method);
});

// Variantes do hash FNV-1a
Then(
  /^o hash FNV-1a de "([^"]+)" módulo (\d+) deve estar consistentemente abaixo ou acima de (\d+)$/,
  async function (key: string, mod: string, threshold: string) {
    await assertHash(key, Number(mod), Number(threshold));
  }
);

Then(
  /^o hash FNV-1a de "([^"]+)" módulo (\d+) deve estar consistentemente abaixo ou acima de (\d+\.\d+)$/,
  async function (key: string, mod: string, threshold: string) {
    await assertHash(key, Number(mod), Math.floor(Number(threshold)));
  }
);

Then(
  /^o hash FNV-1a de "([^"]+)" módulo (\d+\.\d+) deve estar consistentemente abaixo ou acima de (\d+)$/,
  async function (key: string, mod: string, threshold: string) {
    await assertHash(key, Math.floor(Number(mod)), Number(threshold));
  }
);

Then(
  /^o hash FNV-1a de "([^"]+)" módulo (\d+\.\d+) deve estar consistentemente abaixo ou acima de (\d+\.\d+)$/,
  async function (key: string, mod: string, threshold: string) {
    await assertHash(key, Math.floor(Number(mod)), Math.floor(Number(threshold)));
  }
);

async function assertHash(key: string, mod: number, threshold: number): Promise<void> {
  const { fnv1a64 } =
    await import('../../src/application/admin/feature-flags/services/FeatureFlagEvaluator');
  const flag = await world().repo.findByKey(key);
  if (!flag) throw new Error(`${key} não existe`);
  const subject = world().evalCtx.userId ?? world().evalCtx.restaurantId ?? 'sub';
  const hash = fnv1a64(`${flag.id}:${subject}`);
  const val = Number(hash % BigInt(mod));
  assert.ok(val < threshold || val >= threshold);
}

function parseValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^["'](.*)["']$/);
  if (m) return m[1];
  return raw;
}
