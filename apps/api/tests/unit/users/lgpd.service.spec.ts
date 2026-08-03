import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { LgpdService } from '../../../src/users/lgpd.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * @spec(RF-AUTH-12, RF-AUTH-13)
 * Materializa os cenários de teste para os direitos de acesso e eliminação
 * previstos em LGPD art. 18, V e VI.
 */
describe('LgpdService', () => {
  let lgpdService: LgpdService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    usersProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
    refreshToken: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    lgpdService = new LgpdService(mockPrisma as unknown as PrismaService);
  });

  /**
   * @spec(RF-AUTH-12) — LGPD art. 18, V: direito de acesso
   */
  describe('exportUserData', () => {
    it('retorna objeto com subject, orders, refreshTokens, passwordResetTokens e subscriptions', async () => {
      const userId = 'user-1';
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        role: 'cliente',
        restaurantId: 'rest-1',
        name: 'João',
        email: 'joao@exemplo.com',
        createdAt: new Date('2026-01-01'),
      });
      mockPrisma.order.findMany.mockResolvedValueOnce([
        {
          id: 'order-1',
          customerId: userId,
          status: 'paid',
          totalPrice: 50,
          items: [{ id: 'item-1', quantity: 2 }],
          paymentIntents: [{ id: 'pi-1', status: 'paid', amount: 50 }],
        },
      ]);
      mockPrisma.refreshToken.findMany.mockResolvedValueOnce([
        { id: 'rt-1', revokedAt: null, revokedReason: null },
      ]);
      mockPrisma.passwordResetToken.findMany.mockResolvedValueOnce([
        { id: 'prt-1', used: false, expiresAt: new Date('2026-09-01') },
      ]);
      mockPrisma.subscription.findMany.mockResolvedValueOnce([
        { id: 'sub-1', status: 'active', planType: 'pro' },
      ]);

      const result = await lgpdService.exportUserData(userId);

      expect(result).toMatchObject({
        legalBasis: 'LGPD art. 18, V — direito de acesso',
        subject: {
          id: userId,
          role: 'cliente',
          email: 'joao@exemplo.com',
        },
      });
      expect(result.orders).toHaveLength(1);
      expect(result.refreshTokens).toHaveLength(1);
      expect(result.passwordResetTokens).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.exportedAt).toBeTruthy();
    });

    it('não inclui subscriptions se usuário sem restaurante vinculado', async () => {
      const userId = 'user-2';
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        role: 'cliente',
        restaurantId: null,
        name: 'Maria',
        email: 'maria@exemplo.com',
        createdAt: new Date('2026-02-01'),
      });
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      mockPrisma.refreshToken.findMany.mockResolvedValueOnce([]);
      mockPrisma.passwordResetToken.findMany.mockResolvedValueOnce([]);

      const result = await lgpdService.exportUserData(userId);

      expect(result.subscriptions).toEqual([]);
      expect(mockPrisma.subscription.findMany).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando user não existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce(null);

      await expect(lgpdService.exportUserData('inexistente')).rejects.toThrow(NotFoundException);
    });

    it('paymentIntents agregados a partir dos orders (sem query extra)', async () => {
      const userId = 'user-3';
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        role: 'cliente',
        restaurantId: null,
        name: 'Pedro',
        email: 'pedro@exemplo.com',
        createdAt: new Date('2026-03-01'),
      });
      mockPrisma.order.findMany.mockResolvedValueOnce([
        {
          id: 'order-2',
          items: [],
          paymentIntents: [
            { id: 'pi-1', status: 'paid' },
            { id: 'pi-2', status: 'refunded' },
          ],
        },
        {
          id: 'order-3',
          items: [],
          paymentIntents: [{ id: 'pi-3', status: 'pending' }],
        },
      ]);
      mockPrisma.refreshToken.findMany.mockResolvedValueOnce([]);
      mockPrisma.passwordResetToken.findMany.mockResolvedValueOnce([]);

      const result = await lgpdService.exportUserData(userId);

      expect(result.paymentIntents).toHaveLength(3);
    });
  });

  /**
   * @spec(RF-AUTH-13) — LGPD art. 18, VI: direito de eliminação
   */
  describe('anonymizeOwnAccount', () => {
    const userId = 'user-to-delete';

    it('anonimiza email/name e zera passwordHash', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        email: 'original@exemplo.com',
      });
      // $transaction é chamado e executa o callback
      mockPrisma.$transaction.mockImplementationOnce(async (cb) => {
        return cb(mockPrisma);
      });

      const result = await lgpdService.anonymizeOwnAccount(userId);

      expect(result.success).toBe(true);
      expect(result.alreadyAnonymized).toBe(false);
      expect(mockPrisma.usersProfile.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          email: `anon-${userId}@deleted.local`,
          name: 'Usuário Removido',
          passwordHash: null,
        }),
      });
    });

    it('revoga TODOS os refresh tokens ativos', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        email: 'original@exemplo.com',
      });
      mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));

      await lgpdService.anonymizeOwnAccount(userId);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revokedAt: null },
        data: expect.objectContaining({
          revokedReason: 'lgpd_self_deletion',
        }),
      });
      // Confirma que revokedAt é uma Date
      const updateArgs = mockPrisma.refreshToken.updateMany.mock.calls[0][0];
      expect(updateArgs.data.revokedAt).toBeInstanceOf(Date);
    });

    it('invalida password reset tokens em aberto', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        email: 'original@exemplo.com',
      });
      mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));

      await lgpdService.anonymizeOwnAccount(userId);

      expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId, used: false, expiresAt: { gt: expect.any(Date) } },
        data: expect.objectContaining({ used: true }),
      });
    });

    it('NÃO deleta Orders/PaymentIntents (preservação fiscal)', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        email: 'original@exemplo.com',
      });
      mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(mockPrisma));

      const result = await lgpdService.anonymizeOwnAccount(userId);

      expect(result.preservedForFiscalAudit).toEqual(
        expect.arrayContaining(['orders', 'paymentIntents', 'subscriptions'])
      );
      // Confirma que NENHUM delete/update foi emitido em Order/PaymentIntent/Subscription
      expect(mockPrisma.order.delete).toBeUndefined();
      expect(mockPrisma.paymentIntent?.delete).toBeUndefined();
      // usersProfile.update é chamado (anonimização do perfil é intencional)
      expect(mockPrisma.usersProfile.update).toHaveBeenCalledTimes(1);
    });

    it('é idempotente: segunda chamada detecta email já anonimizado', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce({
        id: userId,
        email: `anon-${userId}@deleted.local`, // já anonimizado
      });

      const result = await lgpdService.anonymizeOwnAccount(userId);

      expect(result.success).toBe(true);
      expect(result.alreadyAnonymized).toBe(true);
      // Nenhuma mutação deve ter sido chamada
      expect(mockPrisma.usersProfile.update).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.passwordResetToken.updateMany).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando user não existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValueOnce(null);

      await expect(lgpdService.anonymizeOwnAccount('inexistente')).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
