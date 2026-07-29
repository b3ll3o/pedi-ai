/**
 * Integração: WebhookEvent — idempotência cross-provider (P0-04)
 *
 * **Bug:** model WebhookEvent não tinha `@@unique([externalId])` GLOBAL.
 * Webhooks do Mercado Pago e Asaas com mesmo `externalId` coexistiam —
 * P2002 só disparava intra-provider, débito PIX duplicado cross-provider.
 *
 * **Esperado após fix:** segunda inserção `(provider='asaas', externalId=X)`
 * após `(provider='mercadopago', externalId=X)` lança `Unique constraint violation`
 * (Prisma error code P2002).
 *
 * Não depende do AppModule — usa PrismaClient cru para isolar a checagem
 * de constraint de DB.
 *
 * **Requisito:** DATABASE_URL definida. Em CI, é setada pelo workflow.
 * Localmente, o desenvolvedor precisa subir o banco (`docker-compose up -d postgres`)
 * ou definir CI_INTEGRATION=1 para forçar execução.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/pedi_ai';

describe('WebhookEvent idempotência cross-provider (P0-04)', () => {
  let prisma: PrismaClient;
  let dbAvailable = false;
  const createdExternalIds: string[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.CI_INTEGRATION) {
      console.warn(
        '⚠️  Pulando testes de integração — DATABASE_URL não definida. ' +
          'Suba o banco (docker-compose up -d postgres) ou defina CI_INTEGRATION=1.'
      );
      return;
    }

    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    });

    try {
      await prisma.$connect();
      dbAvailable = true;
    } catch (err) {
      console.warn(`⚠️  Banco indisponível (${(err as Error).message}) — testes pulados.`);
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.$disconnect();
    }
  });

  afterEach(async () => {
    if (!dbAvailable) return;
    if (createdExternalIds.length > 0) {
      await prisma.webhookEvent.deleteMany({
        where: { externalId: { in: [...createdExternalIds] } },
      });
      createdExternalIds.length = 0;
    }
  });

  it('bloqueia colisão cross-provider com mesmo externalId', async () => {
    if (!dbAvailable) return;

    const externalId = `ext-${randomUUID()}`;
    createdExternalIds.push(externalId);

    // 1ª inserção: provider A cria o externalId.
    await prisma.webhookEvent.create({
      data: {
        provider: 'mercadopago',
        externalId,
        eventType: 'payment',
        payload: { source: 'mercadopago', test: 1 },
      },
    });

    // 2ª inserção: provider B com mesmo externalId deve ser bloqueada.
    await expect(
      prisma.webhookEvent.create({
        data: {
          provider: 'asaas',
          externalId,
          eventType: 'payment',
          payload: { source: 'asaas', test: 2 },
        },
      })
    ).rejects.toMatchObject({
      // Prisma lança PrismaClientKnownRequestError com code 'P2002'
      // para violação de unique constraint. .code é a forma tipada.
      code: 'P2002',
    });
  });

  it('permite mesmo externalId em providers diferentes após DELETE', async () => {
    if (!dbAvailable) return;

    // Garante que após remover a linha original, um novo provider
    // pode reivindicar o mesmo externalId (re-uso legítimo).
    const externalId = `ext-${randomUUID()}`;
    createdExternalIds.push(externalId);

    await prisma.webhookEvent.create({
      data: {
        provider: 'mercadopago',
        externalId,
        eventType: 'payment',
        payload: { t: 1 },
      },
    });

    await prisma.webhookEvent.deleteMany({ where: { externalId } });

    // Não deve dar conflito porque o original foi removido.
    await expect(
      prisma.webhookEvent.create({
        data: {
          provider: 'asaas',
          externalId,
          eventType: 'payment',
          payload: { t: 2 },
        },
      })
    ).resolves.toBeDefined();
  });
});
