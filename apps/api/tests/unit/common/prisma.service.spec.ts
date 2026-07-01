import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';

import { PiiCryptoService } from '../../../src/common/pii-crypto.service';

/**
 * PrismaService é um wrapper sobre PrismaClient que aplica a extensão de
 * PII encryption via `$extends(...)` e instrumenta `$queryRaw`/`$executeRaw`
 * para bloquear raw queries contra models PII.
 *
 * **Problema de mocking (Prisma 7):**
 * - `$extends` **não existe** em `PrismaClient.prototype` (resolvido lazy)
 * - `$connect`, `$disconnect`, `$queryRaw`, `$executeRaw` estão no protótipo
 *   com `enumerable: false`, então `vi.spyOn(prototype, ...)` falha
 * - Instanciar `new PrismaClient()` sem opções lança `PrismaClientInitializationError`
 *
 * **Solução:** mockar `@prisma/client` no nível do módulo via `vi.mock`.
 * O factory fornece uma subclasse dummy de PrismaClient que aceita os métodos
 * stub sem precisar de configuração real. Quando `PrismaService` extends
 * `PrismaClient`, nossa classe dummy entra em cena.
 */

const { connectSpy, disconnectSpy, extendsSpy, queryRawSpy, executeRawSpy } = vi.hoisted(() => {
  return {
    connectSpy: vi.fn(),
    disconnectSpy: vi.fn(),
    extendsSpy: vi.fn(),
    queryRawSpy: vi.fn(),
    executeRawSpy: vi.fn(),
  };
});

vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual<typeof import('@prisma/client')>('@prisma/client');
  // Define stubs no PROTÓTIPO (não como fields) para que o override de
  // método em `PrismaService extends MockPrismaClient` tenha precedência.
  class MockPrismaClient {
    // No-op: tudo no prototype.
  }
  (MockPrismaClient.prototype as Record<string, unknown>).$connect = connectSpy;
  (MockPrismaClient.prototype as Record<string, unknown>).$disconnect = disconnectSpy;
  (MockPrismaClient.prototype as Record<string, unknown>).$extends = extendsSpy;
  (MockPrismaClient.prototype as Record<string, unknown>).$queryRaw = queryRawSpy;
  (MockPrismaClient.prototype as Record<string, unknown>).$executeRaw = executeRawSpy;
  return {
    ...actual,
    PrismaClient: MockPrismaClient,
  };
});

// Importação DEVE vir depois do vi.mock para usar o mock.
const { PrismaService } = await import('../../../src/common/prisma.service');

describe('PrismaService', () => {
  let service: InstanceType<typeof PrismaService>;
  let piiCrypto: PiiCryptoService;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    piiCrypto = {
      isEnabled: () => false,
    } as unknown as PiiCryptoService;

    connectSpy.mockClear();
    connectSpy.mockResolvedValue(undefined);
    disconnectSpy.mockClear();
    disconnectSpy.mockResolvedValue(undefined);
    extendsSpy.mockClear();
    extendsSpy.mockReturnValue({});
    queryRawSpy.mockClear();
    queryRawSpy.mockResolvedValue([{ id: 1 }]);
    executeRawSpy.mockClear();
    executeRawSpy.mockResolvedValue(1);

    service = new PrismaService(piiCrypto);
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    vi.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('chama $connect ao iniciar', async () => {
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('loga warning e pula extension quando PII_ENCRYPTION_KEY ausente', async () => {
      const logger = (service as unknown as { logger: { warn: ReturnType<typeof vi.fn> } }).logger;
      const warnSpy = vi.spyOn(logger, 'warn');

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('PII_ENCRYPTION_KEY'));
      // Não tenta aplicar extension quando crypto desabilitado.
      expect(extendsSpy).not.toHaveBeenCalled();
    });

    it('aplica extension quando PII_ENCRYPTION_KEY configurada', async () => {
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      service = new PrismaService(piiCrypto);

      const logger = (service as unknown as { logger: { log: ReturnType<typeof vi.fn> } }).logger;
      const logSpy = vi.spyOn(logger, 'log');

      const mockExtended = { mock: true, usersProfile: {} };
      extendsSpy.mockReturnValue(mockExtended);

      await service.onModuleInit();

      expect(extendsSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PII encryption extension'));
      // piiApplied = true
      expect((service as unknown as { piiApplied: boolean }).piiApplied).toBe(true);
    });

    it('FALHA em produção quando extension joga', async () => {
      process.env.NODE_ENV = 'production';
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      service = new PrismaService(piiCrypto);
      extendsSpy.mockImplementation(() => {
        throw new Error('extension crash');
      });

      await expect(service.onModuleInit()).rejects.toThrow(/CRÍTICA/);
    });

    it('FALHA em staging quando extension joga', async () => {
      process.env.NODE_ENV = 'staging';
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      service = new PrismaService(piiCrypto);
      extendsSpy.mockImplementation(() => {
        throw new Error('extension crash');
      });

      await expect(service.onModuleInit()).rejects.toThrow(/CRÍTICA/);
    });

    it('loga erro e continua em dev/test quando extension joga', async () => {
      process.env.NODE_ENV = 'development';
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      service = new PrismaService(piiCrypto);
      extendsSpy.mockImplementation(() => {
        throw new Error('extension crash');
      });

      const logger = (service as unknown as { logger: { error: ReturnType<typeof vi.fn> } }).logger;
      const errorSpy = vi.spyOn(logger, 'error');

      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao aplicar PII'));
    });
  });

  describe('onModuleDestroy', () => {
    it('chama $disconnect ao destruir', async () => {
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getExtendedClient', () => {
    it('retorna um novo extended client via $extends', () => {
      const mockExtended = { usersProfile: {} };
      extendsSpy.mockReturnValue(mockExtended);

      const result = service.getExtendedClient();

      expect(result).toBe(mockExtended);
      expect(extendsSpy).toHaveBeenCalled();
    });
  });

  describe('$queryRaw — guard contra PII raw queries', () => {
    it('bloqueia query contra UsersProfile', () => {
      const sql = Prisma.sql`SELECT * FROM "UsersProfile"`;
      expect(() => service.$queryRaw(sql)).toThrow(/UsersProfile.*proibida/);
    });

    it('bloqueia query contra Order (PII em customerPhone/Name/Email)', () => {
      const sql = Prisma.sql`SELECT id FROM "Order" WHERE status = 'paid'`;
      expect(() => service.$queryRaw(sql)).toThrow(/Order.*proibida/);
    });

    it('permite query contra model não-PII (Product)', () => {
      const sql = Prisma.sql`SELECT * FROM "Product"`;
      service.$queryRaw(sql);

      expect(queryRawSpy).toHaveBeenCalled();
    });

    it('aceita TemplateStringsArray (template literal)', () => {
      const sql = Prisma.sql`SELECT id FROM "Product" WHERE categoryId = ${1}`;
      service.$queryRaw(sql);

      expect(queryRawSpy).toHaveBeenCalled();
    });
  });

  describe('$executeRaw — guard contra PII raw queries', () => {
    it('bloqueia update contra UsersProfile', () => {
      const sql = Prisma.sql`UPDATE "UsersProfile" SET name = 'x' WHERE id = 1`;
      expect(() => service.$executeRaw(sql)).toThrow(/UsersProfile.*proibida/);
    });

    it('bloqueia insert em Order', () => {
      const sql = Prisma.sql`INSERT INTO "Order" (id, total) VALUES (1, 100)`;
      expect(() => service.$executeRaw(sql)).toThrow(/Order.*proibida/);
    });

    it('permite update em model não-PII', () => {
      const sql = Prisma.sql`UPDATE "Product" SET name = 'x' WHERE id = 1`;
      service.$executeRaw(sql);

      expect(executeRawSpy).toHaveBeenCalled();
    });
  });
});
