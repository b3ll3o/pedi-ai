/**
 * Step definitions BDD — PII Encryption at-rest (P0-06).
 *
 * Cobre os cenários em `test/features/shared/pii-encryption.feature`.
 * Diferente dos steps de feature-flags (que usam stubs em memória),
 * aqui exercitamos o `PiiCryptoService` real, sem Prisma, para travar
 * o contrato do algoritmo e formato (AES-256-GCM, prefixo `v1:`).
 *
 * Verificação empírica (com DB real) está em
 * `tests/integration/pii-encryption-transaction.spec.ts`.
 *
 * Idioma: pt-BR.
 */

import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';

import { ConfigService } from '@nestjs/config';

import { PiiCryptoService } from '../../src/common/pii-crypto.service';

interface PiiWorld {
  crypto: PiiCryptoService | null;
  ultimoCiphertext: string | null | undefined;
  ultimoPlaintext: string | null | undefined;
  mensagemErro: string | null;
  nodeEnvOriginal: string | undefined;
}

const world: PiiWorld = {
  crypto: null,
  ultimoCiphertext: null,
  ultimoPlaintext: null,
  mensagemErro: null,
  nodeEnvOriginal: process.env.NODE_ENV,
};

Before(function () {
  world.crypto = null;
  world.ultimoCiphertext = null;
  world.ultimoPlaintext = null;
  world.mensagemErro = null;
});

After(function () {
  if (world.nodeEnvOriginal === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = world.nodeEnvOriginal;
  }
});

function svc(): PiiCryptoService {
  if (!world.crypto) {
    throw new Error('PiiCryptoService não inicializado — step "Dado" ausente?');
  }
  return world.crypto;
}

// ─────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────

Given('uma instância de PiiCryptoService com chave de 32+ caracteres', function () {
  world.crypto = new PiiCryptoService({
    get: (k: string) =>
      k === 'PII_ENCRYPTION_KEY' ? 'chave-de-teste-pii-com-32-chars!!' : undefined,
  } as unknown as ConfigService);
  svc().onModuleInit();
  assert.strictEqual(svc().isEnabled(), true, 'crypto deveria estar habilitado');
});

Given(
  'uma instância de PiiCryptoService sem PII_ENCRYPTION_KEY e NODE_ENV={string}',
  function (env: string) {
    process.env.NODE_ENV = env;
    world.crypto = new PiiCryptoService({
      get: (_k: string) => undefined,
    } as unknown as ConfigService);
    try {
      svc().onModuleInit();
      world.mensagemErro = null;
    } catch (err) {
      world.mensagemErro = (err as Error).message;
    }
  }
);

Given('o formato de saída esperado `v1:<iv-hex>:<tag-hex>:<ct-hex>`', function () {
  // Documentacional — o regex é aplicado inline nos steps Then.
});

// ─────────────────────────────────────────────────────────────────
// Ações
// ─────────────────────────────────────────────────────────────────

When('eu criptografo o valor {string}', function (valor: string) {
  world.ultimoCiphertext = svc().encrypt(valor);
});

When('eu criptografo o valor `null`', function () {
  world.ultimoCiphertext = svc().encrypt(null);
});

When('eu criptografo o valor `undefined`', function () {
  world.ultimoCiphertext = svc().encrypt(undefined);
});

When('eu criptografo o valor {string} duas vezes', function (valor: string) {
  // Guarda no próprio mundo duas chaves para comparação.
  (world as unknown as { _ct1?: string; _ct2?: string })._ct1 = svc().encrypt(valor);
  (world as unknown as { _ct1?: string; _ct2?: string })._ct2 = svc().encrypt(valor);
});

When('eu criptografo o valor {string} e troco o último caractere do resultado', function (valor: string) {
  const ct = svc().encrypt(valor);
  if (!ct) throw new Error('encrypt retornou null');
  world.ultimoCiphertext = ct.slice(0, -1) + (ct.endsWith('0') ? '1' : '0');
});

When(
  'eu criptografo o valor {string} e descriptografo o resultado',
  function (valor: string) {
    const ct = svc().encrypt(valor);
    world.ultimoPlaintext = svc().decrypt(ct);
  }
);

When('o serviço for inicializado', function () {
  // Já inicializado no step `Given`. Aqui só verificamos mensagem de erro.
});

When('eu consulto os campos encriptados de {string}', function (model: string) {
  const campos = PiiCryptoService.getEncryptedFields(model);
  (world as unknown as { _ultimoSet?: Set<string> })._ultimoSet = campos;
});

When('eu pergunto se {string} é PII de {string}', function (field: string, model: string) {
  world.ultimoPlaintext = String(PiiCryptoService.isEncryptedField(model, field));
});

// ─────────────────────────────────────────────────────────────────
// Asserções
// ─────────────────────────────────────────────────────────────────

Then('o resultado deve começar com {string}', function (prefixo: string) {
  assert.ok(
    typeof world.ultimoCiphertext === 'string' && world.ultimoCiphertext.startsWith(prefixo),
    `esperado começar com "${prefixo}", recebido: ${String(world.ultimoCiphertext)}`
  );
});

Then('deve conter {int} segmentos separados por ":"', function (n: number) {
  const partes = String(world.ultimoCiphertext).split(':');
  assert.strictEqual(partes.length, n, `esperado ${n} segmentos, recebido ${partes.length}`);
});

Then('o segmento {int} \\(iv\\) deve ter {int} caracteres hexadecimais', function (idx: number, len: number) {
  const partes = String(world.ultimoCiphertext).split(':');
  const seg = partes[idx - 1];
  assert.strictEqual(seg.length, len, `segmento ${idx} esperado ${len} chars, recebido ${seg.length}`);
  assert.match(seg, /^[0-9a-f]+$/i, `segmento ${idx} não é hexadecimal: ${seg}`);
});

Then('o segmento {int} \\(tag\\) deve ter {int} caracteres hexadecimais', function (idx: number, len: number) {
  const partes = String(world.ultimoCiphertext).split(':');
  const seg = partes[idx - 1];
  assert.strictEqual(seg.length, len, `segmento ${idx} esperado ${len} chars, recebido ${seg.length}`);
  assert.match(seg, /^[0-9a-f]+$/i, `segmento ${idx} não é hexadecimal: ${seg}`);
});

Then('o resultado NÃO deve ser igual a {string}', function (valor: string) {
  assert.notStrictEqual(world.ultimoCiphertext, valor);
});

Then('o valor recuperado deve ser {string}', function (esperado: string) {
  assert.strictEqual(world.ultimoPlaintext, esperado);
});

Then('os dois ciphertexts devem ser diferentes', function () {
  const ct1 = (world as unknown as { _ct1?: string })._ct1;
  const ct2 = (world as unknown as { _ct2?: string })._ct2;
  assert.ok(ct1 && ct2, 'ciphertexts ausentes');
  assert.notStrictEqual(ct1, ct2);
});

Then('mas ambos descriptografados devem retornar {string}', function (esperado: string) {
  const ct1 = (world as unknown as { _ct1?: string })._ct1;
  const ct2 = (world as unknown as { _ct2?: string })._ct2;
  assert.strictEqual(svc().decrypt(ct1), esperado);
  assert.strictEqual(svc().decrypt(ct2), esperado);
});

Then('descriptografar o valor adulterado deve retornar `null`', function () {
  const dec = svc().decrypt(world.ultimoCiphertext);
  assert.strictEqual(dec, null);
});

Then('o resultado deve ser `null`', function () {
  assert.strictEqual(world.ultimoCiphertext, null);
});

Then('o resultado deve ser {string}', function (valor: string) {
  assert.strictEqual(world.ultimoCiphertext, valor);
});

Then('deve lançar erro mencionando PII_ENCRYPTION_KEY', function () {
  assert.ok(world.mensagemErro, 'esperava erro, mas onModuleInit passou');
  assert.match(world.mensagemErro, /PII_ENCRYPTION_KEY/);
});

Then('o servico nao esta habilitado', function () {
  assert.strictEqual(svc().isEnabled(), false);
});

Then('encrypt retorna o plaintext como esta', function () {
  assert.strictEqual(svc().encrypt('joão'), 'joão');
});

Then('decrypt retorna o ciphertext como esta', function () {
  assert.strictEqual(svc().decrypt('joão'), 'joão');
});

Then('eu consulto os campos encriptados de {string}', function (model: string) {
  const campos = PiiCryptoService.getEncryptedFields(model);
  (world as unknown as { _ultimoSet?: Set<string> })._ultimoSet = campos;
});

Then('ambos devem retornar o mesmo conjunto contendo {string}', function (field: string) {
  const a = PiiCryptoService.getEncryptedFields('UsersProfile');
  const b = PiiCryptoService.getEncryptedFields('usersProfile');
  assert.deepStrictEqual([...a].sort(), [...b].sort());
  assert.ok(a.has(field), `esperava conter "${field}", tem: ${[...a].join(', ')}`);
});

Then('o resultado deve ser vazio', function () {
  const set = (world as unknown as { _ultimoSet?: Set<string> })._ultimoSet;
  assert.ok(set, 'conjunto não capturado');
  assert.strictEqual(set.size, 0);
});

Then('a resposta deve ser `true`', function () {
  assert.strictEqual(world.ultimoPlaintext, 'true');
});

Then('a resposta deve ser `false`', function () {
  assert.strictEqual(world.ultimoPlaintext, 'false');
});

Then('o conjunto deve conter {string}', function (field: string) {
  const set = (world as unknown as { _ultimoSet?: Set<string> })._ultimoSet;
  assert.ok(set, 'conjunto não capturado');
  assert.ok(set.has(field), `esperava conter "${field}", tem: ${[...set].join(', ')}`);
});

Then('o conjunto deve conter {string}, {string} e {string}', function (a: string, b: string, c: string) {
  const set = (world as unknown as { _ultimoSet?: Set<string> })._ultimoSet;
  assert.ok(set, 'conjunto não capturado');
  assert.ok(set.has(a), `esperava conter "${a}", tem: ${[...set].join(', ')}`);
  assert.ok(set.has(b), `esperava conter "${b}", tem: ${[...set].join(', ')}`);
  assert.ok(set.has(c), `esperava conter "${c}", tem: ${[...set].join(', ')}`);
});
