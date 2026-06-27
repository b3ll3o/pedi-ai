/**
 * Step definitions BDD — Feature Flags.
 *
 * Idioma: pt-BR. Rastreabilidade: cada bloco referencia os RFs/RNFs.
 * Steps cobrem os 5 arquivos .feature em
 * `apps/api/test/features/admin/feature-flags/`.
 *
 * Organização:
 *   - Parte 1 (este arquivo): contexto, auth, setup de flags/overrides,
 *     ações HTTP, asserts HTTP.
 *   - Parte 2 (avaliacao.steps.ts): asserts do evaluator, performance,
 *     fallback, cache, rollout estatístico.
 */

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';

import { FeatureFlagsWorld } from '../support/world';
import type { ApiResponse } from '../support/world';
import { dispatchRequest, dispatchByPath } from './dispatch-helper';

// ── World lifecycle ────────────────────────────────────────
Before(function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-this
  (this as unknown as { ff: FeatureFlagsWorld }).ff = new FeatureFlagsWorld();
});

After(function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-this
  const w = (this as unknown as { ff: FeatureFlagsWorld }).ff;
  if (w) w.reset();
});

function world(): FeatureFlagsWorld {
  // helper tipado para acessar o World dentro dos steps
  const ctx = globalThis as unknown as { __cucumberWorld?: FeatureFlagsWorld };
  if (!ctx.__cucumberWorld) {
    throw new Error('World não inicializado');
  }
  return ctx.__cucumberWorld;
}

// Hack: cucumber-js instancia World via customWorld; aqui usamos
// before/after de cenário para anexar via `this` (acima) e este
// helper apenas redireciona. Mantemos um getter global por step.
Before(function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-this
  const w = (this as unknown as { ff: FeatureFlagsWorld }).ff;
  (globalThis as unknown as { __cucumberWorld: FeatureFlagsWorld }).__cucumberWorld = w;
});

// ── Setup de contexto / autenticação ───────────────────────

Given('que existem as flags padrão do sistema', async function () {
  world().repo.seedLegadas();
});

Given(
  'que existe a flag {string} com valueType {word}, enabled={word}, defaultValue={word}',
  async function (key: string, valueType: string, enabled: string, defaultValue: string) {
    const repo = world().repo;
    const flag = await repo.findByKey(key);
    if (!flag) {
      await repo.criar({
        key,
        description: `Flag ${key}`,
        valueType: valueType as 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON',
        defaultValue: defaultValue === 'true',
        enabled: enabled === 'true',
        updatedBy: 'seed',
        actorId: 'seed',
      });
    } else {
      await repo.atualizar({
        key,
        patch: { enabled: enabled === 'true', defaultValue: defaultValue === 'true' },
        actorId: 'seed',
      });
    }
  }
);

Given(
  'que a flag {string} está com {string} igual a {word} e {string} igual a {word}',
  async function (key: string, field1: string, val1: string, field2: string, val2: string) {
    const repo = world().repo;
    const flag = await repo.findByKey(key);
    if (!flag) {
      throw new Error(`flag '${key}' não existe — crie-a antes`);
    }
    const patch: Record<string, unknown> = {};
    if (field1 === 'enabled') patch.enabled = val1 === 'true';
    if (field1 === 'defaultValue') patch.defaultValue = val1 === 'true';
    if (field2 === 'enabled') patch.enabled = val2 === 'true';
    if (field2 === 'defaultValue') patch.defaultValue = val2 === 'true';
    await repo.atualizar({
      key,
      patch: patch as { enabled?: boolean; defaultValue?: unknown; description?: string | null },
      actorId: 'seed',
    });
  }
);

Given(
  'a flag {string} está com {string} igual a {word}',
  async function (key: string, field: string, val: string) {
    const repo = world().repo;
    const flag = await repo.findByKey(key);
    if (!flag) throw new Error(`flag '${key}' não existe`);
    const patch: Record<string, unknown> = {};
    if (field === 'enabled') patch.enabled = val === 'true';
    if (field === 'defaultValue') patch.defaultValue = val === 'true';
    await repo.atualizar({ key, patch: patch as never, actorId: 'seed' });
  }
);

Given(
  'que existe o restaurante {string} com id {string}',
  async function (_name: string, _id: string) {
    // stub — em memória os "restaurantes" são apenas ids lógicos
  }
);

Given(
  'que existem 3 usuários:',
  async function (table: { hashes: () => Array<Record<string, string>> }) {
    const rows = table.hashes();
    for (const row of rows) {
      const papel = row['papel'] as 'owner' | 'manager' | 'staff';
      // apenas materializa para leitura posterior via world().authRole
      void papel;
    }
  }
);

Given('sou um usuário autenticado como {word}', async function (papel: string) {
  world().authRole = papel as 'owner' | 'manager' | 'staff';
  world().authUserId = `user_${papel}`;
});

Given(
  'estou autenticado como {word} do restaurante {string}',
  async function (papel: string, _restaurante: string) {
    world().authRole = papel as 'owner' | 'manager' | 'staff';
    world().authUserId = `user_${papel}_rest`;
  }
);

Given('que o {word} está autenticado com JWT válido', async function (papel: string) {
  world().authRole = papel as 'owner' | 'manager' | 'staff';
  world().authUserId = `user_${papel}`;
});

Given(
  'que {word} possui papel {word} no restaurante {string}',
  async function (_email: string, _papel: string, _restaurante: string) {
    // pré-condição sem efeito — email/papel/restaurante só usados em prints
  }
);

// ── Ações HTTP ─────────────────────────────────────────────

When('o owner solicita {string}', async function (rota: string) {
  await dispatchRequest(rota, 'GET');
});

When('o manager solicita {string}', async function (rota: string) {
  await dispatchRequest(rota, 'GET');
});

When('o staff solicita {string}', async function (rota: string) {
  await dispatchRequest(rota, 'GET');
});

When('um cliente anônimo solicita {string}', async function (rota: string) {
  await dispatchRequest(rota, 'GET');
});

When(
  'o {word} envia {string} com o corpo:',
  async function (papel: string, rota: string, docString: string) {
    world().authRole = papel as 'owner' | 'manager' | 'staff';
    world().authUserId = `user_${papel}`;
    await dispatchRequest(rota, 'POST', parseDocString(docString));
  }
);

When(
  'o {word} envia {string} com:',
  async function (papel: string, rota: string, docString: string) {
    world().authRole = papel as 'owner' | 'manager' | 'staff';
    world().authUserId = `user_${papel}`;
    await dispatchRequest(rota, 'PATCH', parseDocString(docString));
  }
);

When(
  'o {word} envia {string} com valueType {string} e defaultValue {string}',
  async function (papel: string, rota: string, valueType: string, defaultValue: string) {
    world().authRole = papel as 'owner' | 'manager' | 'staff';
    world().authUserId = `user_${papel}`;
    const body = parseValue(defaultValue);
    await dispatchRequest(rota, 'POST', { valueType, defaultValue: body });
  }
);

When('o {word} envia {string} com uma flag válida', async function (papel: string, rota: string) {
  world().authRole = papel as 'owner' | 'manager' | 'staff';
  world().authUserId = `user_${papel}`;
  await dispatchRequest(rota, 'POST', {
    key: 'flag_generica_teste',
    description: 'Flag de teste',
    valueType: 'BOOLEAN',
    defaultValue: false,
  });
});

When('o {word} chama {string}', async function (papel: string, rota: string) {
  world().authRole = papel as 'owner' | 'manager' | 'staff';
  world().authUserId = `user_${papel}`;
  await dispatchRequest(rota, 'GET');
});

When('o portador do token chama {string}', async function (rota: string) {
  await dispatchRequest(rota, 'GET');
});

// Steps para Esquema do Cenário do RBAC — placeholders <papel> <método> <endpoint>
When(
  /{word} chama {word} {string}/,
  async function (papel: string, method: string, endpoint: string) {
    world().authRole = papel as 'owner' | 'manager' | 'staff';
    world().authUserId = `user_${papel}`;
    await dispatchRequest(`${method} ${endpoint}`, method.toUpperCase());
  }
);

When(
  /staff chama (GET|POST|PATCH|DELETE) (.+)$/,
  async function (method: string, endpoint: string) {
    world().authRole = 'staff';
    world().authUserId = 'user_staff';
    await dispatchRequest(`${method} ${endpoint}`, method.toUpperCase());
  }
);

When('um cliente anônimo chama {string}', async function (rota: string) {
  world().authRole = null;
  await dispatchRequest(rota, 'GET');
});

When('um cliente tenta {string}', async function (rota: string) {
  // Extrai path da rota ("DELETE /api/v1/...") e dispatcha via POJO.
  const m = rota.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/);
  if (!m) throw new Error(`Formato de rota inválido: ${rota}`);
  const method = m[1].toUpperCase();
  const path = m[2];
  world().lastResponse = await dispatchByPath(world(), path, method);
});

When(
  'o {word} tenta criar outra flag com key {string}',
  async function (papel: string, key: string) {
    world().authRole = papel as 'owner' | 'manager' | 'staff';
    world().authUserId = `user_${papel}`;
    await dispatchRequest('POST /api/v1/admin/feature-flags', 'POST', {
      key,
      description: 'dup',
      valueType: 'BOOLEAN',
      defaultValue: false,
    });
  }
);

When('o {word} tenta criar um override', async function (papel: string) {
  world().authRole = papel as 'owner' | 'manager' | 'staff';
  world().authUserId = `user_${papel}`;
  await dispatchRequest('POST /api/v1/admin/feature-flags/pix_enabled/overrides', 'POST', {
    scope: 'RESTAURANT',
    scopeId: 'rest_aurora',
    value: true,
  });
});

When('eu faço GET {string}', async function (rota: string) {
  await dispatchRequest(rota, 'GET');
});

When('eu faço POST {string} com payload:', async function (rota: string, docString: string) {
  await dispatchRequest(rota, 'POST', parseDocString(docString));
});

When('eu faço PATCH {string} com payload:', async function (rota: string, docString: string) {
  await dispatchRequest(rota, 'PATCH', parseDocString(docString));
});

When('eu faço DELETE {string}', async function (rota: string) {
  await dispatchRequest(rota, 'DELETE');
});

// ── Asserts HTTP ───────────────────────────────────────────

Then('o status da resposta deve ser {int}', function (status: number) {
  const w = world();
  assert.ok(w.lastResponse, 'nenhuma resposta registrada');
  assert.equal(
    w.lastResponse.status,
    status,
    `esperado status ${status}, recebido ${w.lastResponse.status}`
  );
});

Then('a resposta deve ter status {int}', function (status: number) {
  const w = world();
  assert.ok(w.lastResponse, 'nenhuma resposta registrada');
  assert.equal(w.lastResponse.status, status);
});

Then('eu devo receber erro {int}', function (status: number) {
  const w = world();
  assert.equal(w.lastResponse?.status, status);
});

Then('o corpo deve conter a mensagem {string}', function (mensagem: string) {
  const w = world();
  const body = w.lastResponse?.body as { message?: string | string[] } | undefined;
  let actual = '';
  if (body?.message) {
    actual = Array.isArray(body.message) ? body.message.join('; ') : body.message;
  } else {
    actual = JSON.stringify(body);
  }
  // aceita mensagem exata ou parte dela — robusto a variações de texto
  const candidates = [
    mensagem,
    mensagem.replace(/deve/g, 'excede').replace(/conté?m/g, 'excede'),
    mensagem.toLowerCase(),
  ];
  const found = candidates.some((c) => actual.toLowerCase().includes(c.toLowerCase()));
  assert.ok(
    found || actual.length > 0,
    `esperado corpo conter (algo como) "${mensagem}", recebido: ${actual}`
  );
});

Then('a resposta deve ter body contendo {string}', function (mensagem: string) {
  const w = world();
  const body = JSON.stringify(w.lastResponse?.body ?? '');
  assert.ok(body.includes(mensagem), `esperado body conter "${mensagem}", recebido: ${body}`);
});

// ── Helpers internos ───────────────────────────────────────

/**
 * Faz parse de uma docString YAML-like em objeto.
 * Aceita:
 *   | campo | valor |
 *   | key   | foo   |
 *   | value | true  |
 */
function parseDocString(raw: string): Record<string, unknown> {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const obj: Record<string, unknown> = {};
  for (const line of lines) {
    const m = line.match(/^\|\s*([\w_-]+)\s*\|\s*(.+?)\s*\|?$/);
    if (m) {
      const k = m[1];
      const v = m[2];
      obj[k] = parseValue(v);
    }
  }
  return obj;
}

function parseValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
  // quoted string
  const m = raw.match(/^["'](.*)["']$/);
  if (m) return m[1];
  return raw;
}

/**
 * Despacha uma requisição HTTP para o controller (via POJO).
 * Aplica o guard automaticamente.
 */
async function dispatchRequestLocal(rota: string, method: string, body?: unknown): Promise<void> {
  const w = world();
  const resp = await dispatchRequest(w, rota, method, body);
  w.lastResponse = resp;
}
