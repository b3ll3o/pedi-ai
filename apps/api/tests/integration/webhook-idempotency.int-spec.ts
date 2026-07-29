/**
 * Integração: WebhookEvent — idempotência cross-provider (P0-04)
 *
 * **Bug:** model WebhookEvent não tinha `@@unique([provider, externalId])`.
 * Webhooks do Mercado Pago e Asaas com mesmo `externalId` coexistiam —
 * P2002 só disparava intra-provider, débito PIX duplicado cross-provider.
 *
 * **Esperado após fix:** segunda inserção `(provider='asaas', externalId=X)`
 * após `(provider='mercadopago', externalId=X)` lança `Unique constraint violation`
 * (Prisma error code P2002).
 *
 * Não depende do AppModule — usa PrismaClient cru para isolar a checagem
 * de constraint de DB.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/pedi_ai';

describe('WebhookEvent idempotência cross-provider (P0-04)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('bloqueia colisão cross-provider com mesmo externalId', async () => {
    const externalId = `ext-${randomUUID()}`;

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

    // Cleanup — usa try/catch pois o `await expect` acima não
    // executa o cleanup automaticamente quando o insert falha.
    await prisma.webhookEvent.deleteMany({ where: { externalId } });
  });

  it('permite mesmo externalId em providers diferentes após DELETE', async () => {
    // Garante que após remover a linha original, um novo provider
    // pode reivindicar o mesmo externalId (re-uso legítimo).
    const externalId = `ext-${randomUUID()}`;

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

    await prisma.webhookEvent.deleteMany({ where: { externalId } });
  });
});
