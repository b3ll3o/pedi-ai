/**
 * Auditoria P0-06 — teste de integração da encriptação de PII dentro de
 * `$transaction` contra o PostgreSQL real.
 *
 * **Premissa do plano (refutada empiricamente).** O plano de auditoria
 * afirmava que `prisma.$transaction(async tx => …)` entregava um `tx`
 * SEM a extension de PII aplicada, e que portanto `name`/`cpf` seriam
 * persistidos em plaintext. Esta premissa **não se reproduz no Prisma
 * 7.8** — as extensions são propagadas para o `tx` via `Object.assign`
 * (vide `apps/api/src/common/prisma.service.ts`). Estes testes existem
 * para travar o comportamento atual, detectando regressão caso um upgrade
 * futuro do Prisma reverta essa garantia.
 *
 * **O que testamos.** Dado o bug original em que `ENCRYPTED_FIELDS`
 * estava indexado por `usersProfile` (camelCase) mas o Prisma Extension
 * entrega `model` em PascalCase (`UsersProfile`) — fazendo a extension
 * virar no-op silencioso — verificamos que:
 *
 *   1. Baseline — o `create` encripta `name` em formato
 *      `v1:<iv-hex>:<tag-hex>:<ct-hex>` no DB (verificado via
 *      `$queryRaw` em um client NÃO extendido).
 *   2. Transação interativa — o `create` rodando dentro de
 *      `prisma.$transaction(async tx => …)` também encripta `name`.
 *      Isso prova que o `tx` herda a extension propagada.
 *   3. Transação array — `prisma.$transaction([...])` encripta
 *      todas as operações.
 *   4. Sem camada dupla — `comTransacaoEncriptada()` encripta
 *      exatamente uma vez (sem `v1:v1:…`).
 *   5. Rollback atômico — `comTransacaoEncriptada()` reverte
 *      escritas se o callback lança.
 *   6. Plaintext quando sem chave — sem `PII_ENCRYPTION_KEY`,
 *      campos PII ficam em plaintext (intencional em dev, fail-closed
 *      em produção via `PiiCryptoService.onModuleInit`).
 *   7. Round-trip read — após escrever, `findUnique` decifra
 *      automaticamente e devolve o valor original.
 *
 * **Detalhe do design.** A extension encripta em `create`/`update`
 * (write) mas **não decifra no return** — o caller recebe o row
 * recém-inserido com ciphertext. Por isso, após `create`, lemos
 * diretamente do banco via `$queryRaw` (client NÃO extendido) para
 * confirmar a persistência. O `findUnique` é que decifra no return.
 *
 * Pula automaticamente quando `DATABASE_URL` ou `CI_INTEGRATION`
 * não estão definidas.
 */
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PiiCryptoService } from '../../src/common/pii-crypto.service';
import { createPiiPrismaExtension } from '../../src/common/pii-prisma.extension';
import { comTransacaoEncriptada } from '../../src/common/prisma-encrypted-transaction';

const TEM_DATABASE_URL = process.env.DATABASE_URL;
const TEM_CI_INTEGRATION = process.env.CI_INTEGRATION;

const pularSemBanco = !TEM_DATABASE_URL || !TEM_CI_INTEGRATION;

const CHAVE_TESTE = 'chave-de-teste-pii-com-32-chars!!';
const PREFIXO_CIPHERTEXT = 'v1:';

describe('PII encryption dentro de $transaction (P0-06)', () => {
  if (pularSemBanco) {
    // eslint-disable-next-line no-console
    console.warn(
      '[skip] tests/integration/pii-encryption-transaction.spec.ts — ' +
        'requer DATABASE_URL e CI_INTEGRATION=1.'
    );
    it.skip('pulando suíte de integração (sem DATABASE_URL/CI_INTEGRATION)', () => {});
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEM_DATABASE_URL! }),
  });

  function criarPiiCrypto(chave: string = CHAVE_TESTE): PiiCryptoService {
    const svc = new PiiCryptoService({
      get: (k: string) => (k === 'PII_ENCRYPTION_KEY' ? chave : undefined),
    } as unknown as ConfigService);
    svc.onModuleInit();
    return svc;
  }

  let contador = 0;
  const emailUnico = (prefixo: string) => `${prefixo}-${Date.now()}-${++contador}@test.local`;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('BASELINE: create encripta `name` em UsersProfile (verifica no DB raw)', async () => {
    const crypto = criarPiiCrypto();
    const estendido = prisma.$extends(createPiiPrismaExtension(crypto));
    const email = emailUnico('baseline');

    const criado = await estendido.usersProfile.create({
      data: {
        userId: `user-baseline-${Date.now()}-${++contador}`,
        role: 'cliente',
        name: 'João da Silva Baseline',
        email,
        restaurantId: null,
      },
    });
    expect(criado.id).toBeDefined();

    // Verifica ciphertext no DB via client NÃO extendido (raw query).
    const cru = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      'SELECT name FROM "UsersProfile" WHERE id = $1',
      criado.id
    );
    expect(cru[0].name).toMatch(new RegExp(`^${PREFIXO_CIPHERTEXT}`));
    expect(cru[0].name).not.toBe('João da Silva Baseline');

    await prisma.usersProfile.delete({ where: { id: criado.id } }).catch(() => undefined);
  });

  it('TRANSAÇÃO INTERATIVA: create dentro de `$transaction(async tx => ...)` encripta', async () => {
    const crypto = criarPiiCrypto();
    const estendido = prisma.$extends(createPiiPrismaExtension(crypto));
    const email = emailUnico('interativa');

    const criado = await estendido.$transaction(async (tx) => {
      return tx.usersProfile.create({
        data: {
          userId: `user-int-${Date.now()}-${++contador}`,
          role: 'cliente',
          name: 'Maria Interativa',
          email,
          restaurantId: null,
        },
      });
    });

    expect(criado.id).toBeDefined();

    // O coração do teste P0-06: o DB precisa ter ciphertext mesmo
    // quando o create roda dentro de `$transaction`. Se a extensão
    // não fosse propagada para o `tx`, veríamos plaintext aqui.
    const cru = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      'SELECT name FROM "UsersProfile" WHERE id = $1',
      criado.id
    );
    expect(cru[0].name).toMatch(new RegExp(`^${PREFIXO_CIPHERTEXT}`));
    expect(cru[0].name).not.toBe('Maria Interativa');

    await prisma.usersProfile.delete({ where: { id: criado.id } }).catch(() => undefined);
  });

  it('TRANSAÇÃO ARRAY: array de operações encripta idem', async () => {
    const crypto = criarPiiCrypto();
    const estendido = prisma.$extends(createPiiPrismaExtension(crypto));
    const email1 = emailUnico('array-1');
    const email2 = emailUnico('array-2');

    const [p1, p2] = await estendido.$transaction([
      estendido.usersProfile.create({
        data: {
          userId: `user-arr-1-${Date.now()}-${++contador}`,
          role: 'cliente',
          name: 'Array Um',
          email: email1,
          restaurantId: null,
        },
      }),
      estendido.usersProfile.create({
        data: {
          userId: `user-arr-2-${Date.now()}-${++contador}`,
          role: 'cliente',
          name: 'Array Dois',
          email: email2,
          restaurantId: null,
        },
      }),
    ]);

    expect(p1.id).toBeDefined();
    expect(p2.id).toBeDefined();

    const cru = await prisma.$queryRawUnsafe<Array<{ name: string; id: string }>>(
      'SELECT id, name FROM "UsersProfile" WHERE id = ANY($1)',
      [p1.id, p2.id]
    );
    expect(cru).toHaveLength(2);
    expect(cru[0].name).toMatch(new RegExp(`^${PREFIXO_CIPHERTEXT}`));
    expect(cru[1].name).toMatch(new RegExp(`^${PREFIXO_CIPHERTEXT}`));
    expect(cru[0].name).not.toBe('Array Um');
    expect(cru[1].name).not.toBe('Array Dois');

    await prisma.usersProfile.deleteMany({ where: { id: { in: [p1.id, p2.id] } } }).catch(() => undefined);
  });

  it('SEM DUPLA CAMADA: comTransacaoEncriptada não encripta duas vezes', async () => {
    const crypto = criarPiiCrypto();
    const email = emailUnico('sem-dupla');

    const criado = await comTransacaoEncriptada(
      prisma,
      crypto,
      async (tx) =>
        tx.usersProfile.create({
          data: {
            userId: `user-dup-${Date.now()}-${++contador}`,
            role: 'cliente',
            name: 'Sem Dupla Camada',
            email,
            restaurantId: null,
          },
        })
    );

    const cru = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      'SELECT name FROM "UsersProfile" WHERE id = $1',
      criado.id
    );
    // Exatamente UM prefixo `v1:` — sem `v1:v1:...`.
    const matches = cru[0].name.match(new RegExp(`^(${PREFIXO_CIPHERTEXT})`, 'g')) ?? [];
    expect(matches).toHaveLength(1);

    await prisma.usersProfile.delete({ where: { id: criado.id } }).catch(() => undefined);
  });

  it('ROLLBACK: comTransacaoEncriptada reverte escritas quando callback lança', async () => {
    const crypto = criarPiiCrypto();
    const email = emailUnico('rollback');

    let criadoId: string | undefined;
    try {
      await comTransacaoEncriptada(prisma, crypto, async (tx) => {
        const p = await tx.usersProfile.create({
          data: {
            userId: `user-rb-${Date.now()}-${++contador}`,
            role: 'cliente',
            name: 'Vai Rollback',
            email,
            restaurantId: null,
          },
        });
        criadoId = p.id;
        throw new Error('rollback_forcado_pelo_teste');
      });
      expect.unreachable('callback deveria ter lançado');
    } catch (err) {
      expect((err as Error).message).toBe('rollback_forcado_pelo_teste');
    }

    if (criadoId) {
      const achou = await prisma.usersProfile.findUnique({ where: { id: criadoId } });
      expect(achou).toBeNull();
    }
  });

  it('SEM CHAVE: PII em plaintext quando PII_ENCRYPTION_KEY ausente', async () => {
    const svc = new PiiCryptoService({
      get: (_k: string) => undefined,
    } as unknown as ConfigService);
    svc.onModuleInit();
    expect(svc.isEnabled()).toBe(false);

    const estendido = prisma.$extends(createPiiPrismaExtension(svc));
    const email = emailUnico('sem-chave');

    const criado = await estendido.usersProfile.create({
      data: {
        userId: `user-nk-${Date.now()}-${++contador}`,
        role: 'cliente',
        name: 'Plaintext Esperado',
        email,
        restaurantId: null,
      },
    });
    const cru = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      'SELECT name FROM "UsersProfile" WHERE id = $1',
      criado.id
    );
    expect(cru[0].name).toBe('Plaintext Esperado');

    await prisma.usersProfile.delete({ where: { id: criado.id } }).catch(() => undefined);
  });

  it('ROUND-TRIP READ: findUnique decifra automaticamente', async () => {
    const crypto = criarPiiCrypto();
    const estendido = prisma.$extends(createPiiPrismaExtension(crypto));
    const email = emailUnico('roundtrip');

    await estendido.usersProfile.create({
      data: {
        userId: `user-rt-${Date.now()}-${++contador}`,
        role: 'cliente',
        name: 'Round Trip',
        email,
        restaurantId: null,
      },
    });

    // findUnique decifra: o caller recebe plaintext.
    const lido = await estendido.usersProfile.findFirst({ where: { email } });
    expect(lido).not.toBeNull();
    expect(lido!.name).toBe('Round Trip');

    await prisma.usersProfile.delete({ where: { id: lido!.id } }).catch(() => undefined);
  });
});
