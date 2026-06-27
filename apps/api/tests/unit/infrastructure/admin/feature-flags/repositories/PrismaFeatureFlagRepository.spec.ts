/**
 * @spec(RF-ADM-FF-01..09)
 *
 * Testes do repositório Prisma — `PrismaFeatureFlagRepository`.
 * Foco em queries Prisma, paginação, soft delete não aplicável (aggregate
 * usa audit log + onDelete: Cascade).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { PrismaFeatureFlagRepository } from '../../../../../../src/infrastructure/admin/feature-flags/repositories/PrismaFeatureFlagRepository';

type PrismaMock = {
  featureFlag: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  featureFlagOverride: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  featureFlagAuditLog: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const createPrismaMock = (): PrismaMock => ({
  featureFlag: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  featureFlagOverride: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  featureFlagAuditLog: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe('PrismaFeatureFlagRepository', () => {
  let prisma: PrismaMock;
  let repo: PrismaFeatureFlagRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    repo = new PrismaFeatureFlagRepository(prisma as never);
  });

  describe('listar', () => {
    it('retorna flags com overrideCount calculado', async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { id: 'f1', key: 'pix_enabled' },
        { id: 'f2', key: 'combos_enabled' },
      ]);
      prisma.featureFlagOverride.count
        .mockResolvedValueOnce(3) // pix_enabled
        .mockResolvedValueOnce(0); // combos_enabled
      prisma.featureFlag.count.mockResolvedValue(2);

      const result = await repo.listar({ limit: 50, offset: 0 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(expect.objectContaining({ overrideCount: 3 }));
      expect(result.data[1]).toEqual(expect.objectContaining({ overrideCount: 0 }));
      expect(result.total).toBe(2);
      expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({
        orderBy: { key: 'asc' },
        skip: 0,
        take: 50,
      });
    });

    it('retorna lista vazia quando não há flags', async () => {
      prisma.featureFlag.findMany.mockResolvedValue([]);
      prisma.featureFlag.count.mockResolvedValue(0);

      const result = await repo.listar({ limit: 50, offset: 0 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findByKey', () => {
    it('retorna flag com overrides inline', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        id: 'f1',
        key: 'pix_enabled',
        overrides: [{ id: 'ov_1', scope: 'GLOBAL' }],
      });

      const result = await repo.findByKey('pix_enabled');

      expect(result?.overrides).toHaveLength(1);
      expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
        where: { key: 'pix_enabled' },
        include: { overrides: true },
      });
    });

    it('retorna null quando flag não existe', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);
      const result = await repo.findByKey('flag_inexistente');
      expect(result).toBeNull();
    });

    it('trata flag com overrides undefined (default [])', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        id: 'f1',
        key: 'pix_enabled',
        overrides: undefined,
      });

      const result = await repo.findByKey('pix_enabled');

      expect(result?.overrides).toEqual([]);
    });
  });

  describe('criar', () => {
    it('cria flag e audit log em transação atômica (RNF-RELI-FF-01)', async () => {
      const flag = {
        id: 'f1',
        key: 'pix_enabled',
        description: null,
        valueType: 'BOOLEAN',
        defaultValue: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'owner_1',
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      prisma.featureFlag.create.mockResolvedValue(flag);

      const result = await repo.criar({
        key: 'pix_enabled',
        valueType: 'BOOLEAN',
        defaultValue: false,
        updatedBy: 'owner_1',
        actorId: 'owner_1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.featureFlag.create).toHaveBeenCalledWith({
        data: {
          key: 'pix_enabled',
          description: null,
          valueType: 'BOOLEAN',
          defaultValue: false,
          enabled: true,
          updatedBy: 'owner_1',
        },
      });
      expect(prisma.featureFlagAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            actorId: 'owner_1',
            before: null,
          }),
        })
      );
      expect(result.overrides).toEqual([]);
      expect(result.id).toBe('f1');
    });

    it('aceita description opcional e enabled false', async () => {
      const flag = {
        id: 'f2',
        key: 'combos_enabled',
        description: 'liga combos',
        valueType: 'BOOLEAN',
        defaultValue: true,
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'owner_1',
      };
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      prisma.featureFlag.create.mockResolvedValue(flag);

      await repo.criar({
        key: 'combos_enabled',
        description: 'liga combos',
        valueType: 'BOOLEAN',
        defaultValue: true,
        enabled: false,
        updatedBy: 'owner_1',
        actorId: 'owner_1',
      });

      expect(prisma.featureFlag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'liga combos',
          enabled: false,
        }),
      });
    });
  });

  describe('atualizar', () => {
    const beforeFlag = {
      id: 'f1',
      key: 'pix_enabled',
      description: null,
      valueType: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'owner_1',
      overrides: [],
    };

    it('atualiza flag existente em transação atômica', async () => {
      const afterFlag = { ...beforeFlag, description: 'nova desc', enabled: false };
      prisma.featureFlag.findUnique.mockResolvedValue(beforeFlag);
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      prisma.featureFlag.update.mockResolvedValue(afterFlag);

      const result = await repo.atualizar({
        key: 'pix_enabled',
        patch: { description: 'nova desc', enabled: false },
        actorId: 'owner_1',
      });

      expect(prisma.featureFlag.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { description: 'nova desc', enabled: false },
      });
      expect(prisma.featureFlagAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UPDATE',
            actorId: 'owner_1',
          }),
        })
      );
      expect(result.id).toBe('f1');
    });

    it('lança erro quando flag não existe', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(
        repo.atualizar({
          key: 'nao_existe',
          patch: { enabled: true },
          actorId: 'owner_1',
        })
      ).rejects.toThrow('FeatureFlag não encontrada');
      expect(prisma.featureFlag.update).not.toHaveBeenCalled();
    });

    it('atualiza apenas defaultValue quando patch só tem defaultValue', async () => {
      const afterFlag = { ...beforeFlag, defaultValue: true };
      prisma.featureFlag.findUnique.mockResolvedValue(beforeFlag);
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      prisma.featureFlag.update.mockResolvedValue(afterFlag);

      await repo.atualizar({
        key: 'pix_enabled',
        patch: { defaultValue: true },
        actorId: 'owner_1',
      });

      expect(prisma.featureFlag.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { defaultValue: true },
      });
    });
  });

  describe('adicionarOverride', () => {
    const baseFlag = {
      id: 'f1',
      key: 'pix_enabled',
    };

    it('cria override e audit log em transação atômica', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag);
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      const createdOverride = {
        id: 'ov_1',
        flagId: 'f1',
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        rolloutPct: 25,
        value: true,
        expiresAt: null,
        createdAt: new Date(),
        createdBy: 'owner_1',
      };
      prisma.featureFlagOverride.create.mockResolvedValue(createdOverride);

      const result = await repo.adicionarOverride({
        flagKey: 'pix_enabled',
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        rolloutPct: 25,
        value: true,
        createdBy: 'owner_1',
        actorId: 'owner_1',
      });

      expect(prisma.featureFlagOverride.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          flagId: 'f1',
          scope: 'RESTAURANT',
          scopeId: 'rest_aurora',
          rolloutPct: 25,
        }),
      });
      expect(prisma.featureFlagAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'OVERRIDE_ADD' }),
        })
      );
      expect(result.id).toBe('ov_1');
      expect(result.flagId).toBe('f1');
    });

    it('lança erro quando flag não existe', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(
        repo.adicionarOverride({
          flagKey: 'nao_existe',
          scope: 'GLOBAL',
          scopeId: null,
          value: true,
          createdBy: 'owner_1',
          actorId: 'owner_1',
        })
      ).rejects.toThrow('FeatureFlag não encontrada');
      expect(prisma.featureFlagOverride.create).not.toHaveBeenCalled();
    });

    it('aceita rolloutPct undefined e expiresAt undefined', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag);
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      prisma.featureFlagOverride.create.mockResolvedValue({
        id: 'ov_2',
        flagId: 'f1',
        scope: 'GLOBAL',
        scopeId: null,
        rolloutPct: null,
        value: true,
        expiresAt: null,
        createdAt: new Date(),
        createdBy: 'owner_1',
      });

      await repo.adicionarOverride({
        flagKey: 'pix_enabled',
        scope: 'GLOBAL',
        scopeId: null,
        value: true,
        createdBy: 'owner_1',
        actorId: 'owner_1',
      });

      expect(prisma.featureFlagOverride.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rolloutPct: null,
          expiresAt: null,
        }),
      });
    });
  });

  describe('removerOverride', () => {
    it('retorna snapshot do override removido (para audit before)', async () => {
      const snapshot = {
        id: 'ov_1',
        flagId: 'f1',
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        rolloutPct: null,
        value: true,
        expiresAt: null,
        createdAt: new Date(),
        createdBy: 'owner_1',
      };
      prisma.featureFlagOverride.findUnique.mockResolvedValue(snapshot);
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      prisma.featureFlagOverride.delete.mockResolvedValue(snapshot);

      const result = await repo.removerOverride('ov_1');

      expect(result).toEqual(snapshot);
      expect(prisma.featureFlagAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'OVERRIDE_REMOVE' }),
        })
      );
    });

    it('usa "system" como actorId quando createdBy é null', async () => {
      const snapshot = {
        id: 'ov_3',
        flagId: 'f1',
        scope: 'GLOBAL',
        scopeId: null,
        rolloutPct: null,
        value: true,
        expiresAt: null,
        createdAt: new Date(),
        createdBy: null,
      };
      prisma.featureFlagOverride.findUnique.mockResolvedValue(snapshot);
      prisma.$transaction.mockImplementation(async (fn: (tx: PrismaMock) => Promise<unknown>) =>
        fn(prisma)
      );
      prisma.featureFlagOverride.delete.mockResolvedValue(snapshot);

      await repo.removerOverride('ov_3');

      expect(prisma.featureFlagAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actorId: 'system' }),
        })
      );
    });

    it('retorna null quando override não existe', async () => {
      prisma.featureFlagOverride.findUnique.mockResolvedValue(null);
      const result = await repo.removerOverride('ov_inexistente');
      expect(result).toBeNull();
      expect(prisma.featureFlagOverride.delete).not.toHaveBeenCalled();
    });
  });

  describe('listarOverrides', () => {
    const baseFlag = { id: 'f1', key: 'pix_enabled' };

    it('lista overrides aplicando filtro de expiresAt e ordenação', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag);
      prisma.featureFlagOverride.findMany.mockResolvedValue([
        {
          id: 'ov_1',
          flagId: 'f1',
          scope: 'GLOBAL',
          scopeId: null,
          rolloutPct: null,
          value: true,
          expiresAt: null,
          createdAt: new Date(),
          createdBy: 'owner_1',
        },
      ]);

      const result = await repo.listarOverrides({ flagKey: 'pix_enabled', limit: 10, offset: 0 });

      expect(prisma.featureFlagOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            flagId: 'f1',
            OR: expect.any(Array),
          }),
          orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
          take: 10,
          skip: 0,
        })
      );
      expect(result).toHaveLength(1);
    });

    it('lança erro quando flag não existe', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(
        repo.listarOverrides({ flagKey: 'nao_existe', limit: 10, offset: 0 })
      ).rejects.toThrow('FeatureFlag não encontrada');
    });
  });

  describe('listarAuditoria', () => {
    it('filtra por flagKey e ordena por createdAt desc', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({ id: 'f1', key: 'pix_enabled' });
      prisma.featureFlagAuditLog.findMany.mockResolvedValue([
        {
          id: 'a1',
          flagId: 'f1',
          actorId: 'owner_1',
          action: 'CREATE',
          before: null,
          after: { foo: 'bar' },
          reason: null,
          createdAt: new Date(),
        },
      ]);

      const result = await repo.listarAuditoria({ flagKey: 'pix_enabled', limit: 50, offset: 0 });

      expect(prisma.featureFlagAuditLog.findMany).toHaveBeenCalledWith({
        where: { flagId: 'f1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('CREATE');
    });

    it('lista auditoria com flagId undefined quando flag não existe', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);
      prisma.featureFlagAuditLog.findMany.mockResolvedValue([]);

      const result = await repo.listarAuditoria({ flagKey: 'nao_existe', limit: 10, offset: 0 });

      expect(prisma.featureFlagAuditLog.findMany).toHaveBeenCalledWith({
        where: { flagId: undefined },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual([]);
    });
  });
});
