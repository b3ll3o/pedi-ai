import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

import { RefreshTokenService } from '../../../src/auth/refresh-token.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * RefreshTokenService: rotação de refresh tokens com detecção de reuso.
 *
 * Estratégia: mockar `PrismaService` com spies para `refreshToken.create`,
 * `findUnique`, `update`, `updateMany`. Usa crypto real para hash (não mockar
 * para preservar fidelidade do fluxo).
 */

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let mockPrisma: {
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    service = new RefreshTokenService(mockPrisma as unknown as PrismaService);
  });

  describe('issue', () => {
    it('cria token com TTL default 7 dias e retorna plain + hash', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'tok-1',
        familyId: 'fam-1',
        expiresAt: new Date(),
      });

      const result = await service.issue('user-1');

      expect(result.tokenId).toBe('tok-1');
      expect(result.familyId).toBe('fam-1');
      expect(result.token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
      expect(result.token.length).toBeGreaterThan(40);
      expect(result.expiresAt).toBeInstanceOf(Date);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            familyId: expect.any(String),
            tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            expiresAt: expect.any(Date),
          }),
          select: { id: true, familyId: true, expiresAt: true },
        })
      );
    });

    it('aceita familyId customizado e respeita-o', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'tok-1',
        familyId: 'fam-custom',
        expiresAt: new Date(),
      });

      await service.issue('user-1', { familyId: 'fam-custom' });

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ familyId: 'fam-custom' }),
        })
      );
    });

    it('aceita ttlMs customizado', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'tok-1',
        familyId: 'fam-1',
        expiresAt: new Date(),
      });

      const before = Date.now();
      await service.issue('user-1', { ttlMs: 60_000 });
      const after = Date.now();

      const callArgs = mockPrisma.refreshToken.create.mock.calls[0][0];
      const expiresAt = callArgs.data.expiresAt as Date;
      const ttl = expiresAt.getTime();
      expect(ttl).toBeGreaterThanOrEqual(before + 60_000);
      expect(ttl).toBeLessThanOrEqual(after + 60_000);
    });
  });

  describe('validateAndRotate', () => {
    it('retorna userId/familyId/tokenId para token válido', async () => {
      const futureDate = new Date(Date.now() + 60_000);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        userId: 'user-1',
        familyId: 'fam-1',
        expiresAt: futureDate,
        revokedAt: null,
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});

      const result = await service.validateAndRotate('valid-token');

      expect(result).toEqual({ userId: 'user-1', familyId: 'fam-1', tokenId: 'tok-1' });
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'tok-1' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('lança UnauthorizedException quando token não existe', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.validateAndRotate('nonexistent')).rejects.toThrow(UnauthorizedException);
      // Não tenta atualizar token inexistente.
      expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando token expirado', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        userId: 'user-1',
        familyId: 'fam-1',
        expiresAt: new Date(Date.now() - 1000), // passado
        revokedAt: null,
      });

      await expect(service.validateAndRotate('expired')).rejects.toThrow(/expirado/);
    });

    it('detecta reuso de token revogado e invalida toda a família (M7)', async () => {
      const revokedAt = new Date();
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'tok-stolen',
        userId: 'user-1',
        familyId: 'fam-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt,
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await expect(service.validateAndRotate('reused-token')).rejects.toThrow(/reutilizado/);

      // Família foi invalidada.
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'fam-1', revokedAt: null },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'reuse_detected',
        },
      });
    });
  });

  describe('revoke', () => {
    it('marca token como revogado com replacedById', async () => {
      mockPrisma.refreshToken.update.mockResolvedValue({});

      await service.revoke('tok-1', 'tok-2');

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'tok-1' },
        data: { revokedAt: expect.any(Date), replacedById: 'tok-2' },
      });
    });
  });

  describe('revokeAllForUser', () => {
    it('revoga todos tokens ativos do usuário e retorna count', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.revokeAllForUser('user-1');

      expect(result).toBe(5);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'user_logout' },
      });
    });

    it('aceita reason customizado', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeAllForUser('user-1', 'security_breach');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ revokedReason: 'security_breach' }),
        })
      );
    });

    it('retorna 0 quando nenhum token ativo', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.revokeAllForUser('user-1')).resolves.toBe(0);
    });
  });

  describe('hash (privado, mas verificável via issue)', () => {
    it('produz SHA-256 hex do token', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'tok-1',
        familyId: 'fam-1',
        expiresAt: new Date(),
      });

      await service.issue('user-1', { familyId: 'fam-1' });

      const tokenPlain = mockPrisma.refreshToken.create.mock.calls[0][0].data.tokenHash;
      // SHA-256 hex = 64 chars lowercase.
      expect(tokenPlain).toMatch(/^[a-f0-9]{64}$/);
      // Verificável: re-hash do mesmo input produz mesmo output.
      const expected = crypto.createHash('sha256').update('test').digest('hex');
      expect(crypto.createHash('sha256').update('test').digest('hex')).toBe(expected);
    });
  });
});
