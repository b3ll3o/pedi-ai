import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';

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

// Mock do driver adapter — PrismaService usa `PrismaPg` para construir
// o client. O adapter cria um socket; em testes unitários não queremos
// abrir conexão de verdade. Substituímos por um stub que aceita qualquer
// option e expõe `getConnectionString()` para asserts de garantia.
vi.mock('@prisma/adapter-pg', () => {
  return {
    PrismaPg: class MockPrismaPg {
      // Apenas aceita o option object — o construtor real tenta conectar.
      constructor(_opts: unknown) {
        /* no-op */
      }
      // Prisma 7 valida internamente; mantemos a interface mínima.
      getConnectionString() {
        return process.env.DATABASE_URL ?? '';
      }
    },
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
    // PrismaService valida DATABASE_URL no construtor (Prisma 7 exige
    // driver adapter apontando para a connection string). Em testes
    // unitários o adapter é mockado, mas a string precisa estar setada.
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';

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
    // DATABASE_URL não é restaurado (não havia valor original a preservar).
    vi.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('chama $connect ao iniciar', async () => {
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('loga warning quando PII_ENCRYPTION_KEY ausente', async () => {
      const logger = (service as unknown as { logger: { warn: ReturnType<typeof vi.fn> } }).logger;
      const warnSpy = vi.spyOn(logger, 'warn');

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('PII_ENCRYPTION_KEY'));
    });

    it('aplica a extension JÁ NO CONSTRUTOR (P0-06 — fecha janela de boot)', () => {
      // Auditoria P0-06: antes, a extension só era instalada em
      // `onModuleInit` (assíncrono, depois de `$connect`). Escritas na
      // janela entre o `new` e o fim do init persistiam PII em plaintext.
      extendsSpy.mockClear();
      extendsSpy.mockReturnValue({});

      const novo = new PrismaService(piiCrypto);

      expect(extendsSpy).toHaveBeenCalled();
      expect((novo as unknown as { piiApplied: boolean }).piiApplied).toBe(true);
    });

    it('aplica extension independentemente de isEnabled() no momento do construtor', () => {
      // A extension consulta `crypto.isEnabled()` a CADA operação, então
      // instalá-la sempre é seguro: se a chave só existir depois, a
      // encriptação passa a valer sem precisar reinstalar nada. Isso
      // remove o acoplamento com a ordem de init dos providers do Nest.
      extendsSpy.mockClear();
      extendsSpy.mockReturnValue({});

      const semChave = new PrismaService({ isEnabled: () => false } as unknown as PiiCryptoService);

      expect(extendsSpy).toHaveBeenCalled();
      expect((semChave as unknown as { piiApplied: boolean }).piiApplied).toBe(true);
    });

    it('aplica extension quando PII_ENCRYPTION_KEY configurada', async () => {
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      const mockExtended = { mock: true, usersProfile: {} };
      extendsSpy.mockReturnValue(mockExtended);
      service = new PrismaService(piiCrypto);

      const logger = (service as unknown as { logger: { log: ReturnType<typeof vi.fn> } }).logger;
      const logSpy = vi.spyOn(logger, 'log');

      await service.onModuleInit();

      expect(extendsSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PII encryption extension'));
      // piiApplied = true
      expect((service as unknown as { piiApplied: boolean }).piiApplied).toBe(true);
    });

    it('FALHA em produção quando extension joga', () => {
      process.env.NODE_ENV = 'production';
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      extendsSpy.mockImplementation(() => {
        throw new Error('extension crash');
      });

      // P0-06: a falha agora acontece no CONSTRUTOR (não mais no init),
      // porque é lá que a extension é instalada.
      expect(() => new PrismaService(piiCrypto)).toThrow(/CRÍTICA/);
    });

    it('FALHA em staging quando extension joga', () => {
      process.env.NODE_ENV = 'staging';
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      extendsSpy.mockImplementation(() => {
        throw new Error('extension crash');
      });

      expect(() => new PrismaService(piiCrypto)).toThrow(/CRÍTICA/);
    });

    it('loga erro e continua em dev/test quando extension joga', () => {
      process.env.NODE_ENV = 'development';
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      extendsSpy.mockImplementation(() => {
        throw new Error('extension crash');
      });

      const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      const degradado = new PrismaService(piiCrypto);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao aplicar PII'));
      expect((degradado as unknown as { piiApplied: boolean }).piiApplied).toBe(false);
    });

    it('retenta aplicar a extension no init se o construtor falhou em dev', async () => {
      process.env.NODE_ENV = 'development';
      piiCrypto = { isEnabled: () => true } as unknown as PiiCryptoService;
      extendsSpy.mockImplementation(() => {
        throw new Error('extension crash');
      });
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      const degradado = new PrismaService(piiCrypto);
      expect((degradado as unknown as { piiApplied: boolean }).piiApplied).toBe(false);

      // Falha transitória resolvida — o init deve conseguir aplicar.
      extendsSpy.mockReset();
      extendsSpy.mockReturnValue({});

      await degradado.onModuleInit();

      expect((degradado as unknown as { piiApplied: boolean }).piiApplied).toBe(true);
    });
  });

  describe('withEncryptedTransaction (P0-06)', () => {
    it('estende o client ANTES de abrir a transação (preserva atomicidade)', async () => {
      // A ordem importa: estender depois — ex. chamando `getExtendedClient()`
      // dentro do callback — cria um client com conexão própria, cujas
      // escritas ficam FORA da transação e não sofrem rollback.
      const txSpy = vi.fn().mockResolvedValue('resultado');
      extendsSpy.mockReturnValue({ $transaction: txSpy });

      const svc = new PrismaService(piiCrypto);
      const callback = vi.fn();
      const resultado = await svc.withEncryptedTransaction(callback);

      expect(txSpy).toHaveBeenCalledWith(callback, undefined);
      expect(resultado).toBe('resultado');
    });

    it('repassa options de transação (isolationLevel, timeout)', async () => {
      const txSpy = vi.fn().mockResolvedValue(undefined);
      extendsSpy.mockReturnValue({ $transaction: txSpy });

      const svc = new PrismaService(piiCrypto);
      const opcoes = { isolationLevel: 'Serializable' as const, timeout: 8_000 };
      const callback = vi.fn();
      await svc.withEncryptedTransaction(callback, opcoes);

      expect(txSpy).toHaveBeenCalledWith(callback, opcoes);
    });

    it('propaga a rejeição do callback (para o rollback acontecer)', async () => {
      const txSpy = vi.fn().mockRejectedValue(new Error('rollback forçado'));
      extendsSpy.mockReturnValue({ $transaction: txSpy });

      const svc = new PrismaService(piiCrypto);

      await expect(svc.withEncryptedTransaction(vi.fn())).rejects.toThrow('rollback forçado');
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
