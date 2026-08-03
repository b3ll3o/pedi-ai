import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { UsersController } from '../../../src/users/users.controller';
import { UsersService } from '../../../src/users/users.service';
import { LgpdService } from '../../../src/users/lgpd.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `UsersController` (228 linhas).
 *
 * Foco: 5 endpoints administrativos (createProfile, updateProfile,
 * deleteProfile, getProfilesByRestaurant, getProfileById) — os
 * endpoints LGPD (exportMe, deleteMe) já estão cobertos por PRs
 * anteriores (`feat(lgpd): endpoints /users/me/export e DELETE
 * /users/me`).
 *
 * Branches cobertas:
 * - createProfile: requester sem restaurantId → Forbidden; delega
 *   com restaurantId do JWT (BOLA defense).
 * - updateProfile: delega ao service.
 * - deleteProfile: requester sem restaurantId → Forbidden;
 *   id === req.user.id → BadRequest (não pode auto-deletar);
 *   delega.
 * - getProfilesByRestaurant: requester sem restaurantId → Forbidden;
 *   delega.
 * - getProfileById: BOLA defesa com matriz staff/cliente.
 *
 * @see .openspec/changes/2026-08-03-test-tables-coverage-mesa/proposal.md
 */
describe('UsersController — cobertura administrativa', () => {
  let controller: UsersController;
  let mockUsersService: ReturnType<typeof createMockUsersService>;
  let mockLgpdService: ReturnType<typeof createMockLgpdService>;
  let mockPrisma: { user: { findUnique: ReturnType<typeof vi.fn> } };

  function createMockUsersService() {
    return {
      findById: vi.fn(),
      getProfilesByUserId: vi.fn(),
      updateOwnProfile: vi.fn(),
      updateProfile: vi.fn(),
      createProfile: vi.fn(),
      deleteProfile: vi.fn(),
      findByRestaurant: vi.fn(),
    };
  }

  function createMockLgpdService() {
    return {
      exportUserData: vi.fn(),
      anonymizeOwnAccount: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersService = createMockUsersService();
    mockLgpdService = createMockLgpdService();
    mockPrisma = { user: { findUnique: vi.fn() } };
    controller = new UsersController(
      mockUsersService as unknown as UsersService,
      mockPrisma as unknown as PrismaService,
      mockLgpdService as unknown as LgpdService
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // createProfile
  // ─────────────────────────────────────────────────────────────────
  describe('createProfile', () => {
    it('rejeita quando requester não tem restaurante vinculado', async () => {
      await expect(
        controller.createProfile(
          { user: { id: 'u-1', restaurantId: null, role: 'dono' } } as never,
          { name: 'Perfil X' } as never
        )
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.createProfile).not.toHaveBeenCalled();
    });

    it('sobrescreve restaurantId do body com o do JWT (BOLA defense)', async () => {
      mockUsersService.createProfile.mockResolvedValueOnce({
        id: 'p1',
        name: 'Perfil X',
        restaurantId: 'rest-jwt',
      });

      await controller.createProfile(
        { user: { id: 'u-1', restaurantId: 'rest-jwt', role: 'gerente' } } as never,
        { name: 'Perfil X', restaurantId: 'rest-other' } as never
      );

      expect(mockUsersService.createProfile).toHaveBeenCalledWith({
        name: 'Perfil X',
        restaurantId: 'rest-jwt',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // updateProfile
  // ─────────────────────────────────────────────────────────────────
  describe('updateProfile', () => {
    it('delega para o service com id + dados + requester', async () => {
      mockUsersService.updateProfile.mockResolvedValueOnce({
        id: 'p1',
        name: 'Atualizado',
      });

      await controller.updateProfile(
        { user: { id: 'u-1', restaurantId: 'rest-1', role: 'gerente' } } as never,
        'p1',
        { name: 'Atualizado' } as never
      );

      expect(mockUsersService.updateProfile).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // deleteProfile — branches: sem restaurantId, id===self, ok
  // ─────────────────────────────────────────────────────────────────
  describe('deleteProfile', () => {
    it('rejeita quando requester não tem restaurante vinculado', async () => {
      await expect(
        controller.deleteProfile(
          { user: { id: 'u-1', restaurantId: null, role: 'dono' } } as never,
          'p-other'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita quando tenta deletar o próprio perfil (id === req.user.id)', async () => {
      // Mas o type é `id: string` vs req.user.id. Aqui testamos com
      // bypass TS (id === req.user.id explicitamente).
      await expect(
        controller.deleteProfile(
          { user: { id: 'u-1', restaurantId: 'rest-1', role: 'dono' } } as never,
          'u-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('delega com id do path + tenant do JWT', async () => {
      mockUsersService.deleteProfile.mockResolvedValueOnce({ success: true });

      const result = await controller.deleteProfile(
        { user: { id: 'u-1', restaurantId: 'rest-1', role: 'dono' } } as never,
        'p-other'
      );

      expect(result).toEqual({ success: true });
      expect(mockUsersService.deleteProfile).toHaveBeenCalledWith('p-other', 'rest-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getProfilesByRestaurant
  // ─────────────────────────────────────────────────────────────────
  describe('getProfilesByRestaurant', () => {
    it('rejeita quando requester não tem restaurante vinculado', async () => {
      await expect(
        controller.getProfilesByRestaurant(
          { user: { id: 'u-1', restaurantId: null, role: 'dono' } } as never,
          {} as never,
          { cursor: undefined, limit: 20 } as never
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('delega para findByRestaurant com restaurantId do JWT', async () => {
      mockUsersService.findByRestaurant.mockResolvedValueOnce({ data: [], hasNext: false });

      await controller.getProfilesByRestaurant(
        { user: { id: 'u-1', restaurantId: 'rest-1', role: 'gerente' } } as never,
        {} as never,
        { cursor: 'cur-1', limit: 50 } as never
      );

      expect(mockUsersService.findByRestaurant).toHaveBeenCalledWith(
        'rest-1',
        {},
        { cursor: 'cur-1', limit: 50 }
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getProfileById — branches: NotFound + BOLA defesa matriz
  // ─────────────────────────────────────────────────────────────────
  describe('getProfileById', () => {
    it('lança NotFoundException quando profile não existe', async () => {
      mockUsersService.findById.mockResolvedValueOnce(null);

      await expect(
        controller.getProfileById(
          { user: { id: 'u-1', restaurantId: 'rest-1', role: 'gerente' } } as never,
          'p-fake'
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('permite acesso ao próprio perfil (cliente vê o próprio)', async () => {
      const profile = {
        id: 'p-1',
        userId: 'u-1',
        restaurantId: 'rest-1',
        name: 'Meu Perfil',
      };
      mockUsersService.findById.mockResolvedValueOnce(profile);

      const result = await controller.getProfileById(
        { user: { id: 'u-1', restaurantId: 'rest-1', role: 'cliente' } } as never,
        'p-1'
      );

      expect(result).toBe(profile);
    });

    it('rejeita cliente que tenta ver perfil de outro (BOLA)', async () => {
      const profile = {
        id: 'p-other',
        userId: 'u-other',
        restaurantId: 'rest-1',
        name: 'Outro',
      };
      mockUsersService.findById.mockResolvedValueOnce(profile);

      await expect(
        controller.getProfileById(
          { user: { id: 'u-1', restaurantId: 'rest-1', role: 'cliente' } } as never,
          'p-other'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite staff admin ver perfil do mesmo restaurante', async () => {
      const profile = {
        id: 'p-other',
        userId: 'u-other',
        restaurantId: 'rest-1',
        name: 'Outro Staff',
      };
      mockUsersService.findById.mockResolvedValueOnce(profile);

      const result = await controller.getProfileById(
        { user: { id: 'u-1', restaurantId: 'rest-1', role: 'dono' } } as never,
        'p-other'
      );

      expect(result).toBe(profile);
    });

    it('rejeita staff admin de outro restaurante (BOLA cross-tenant)', async () => {
      const profile = {
        id: 'p-other',
        userId: 'u-other',
        restaurantId: 'rest-OTHER',
        name: 'Outro Rest',
      };
      mockUsersService.findById.mockResolvedValueOnce(profile);

      await expect(
        controller.getProfileById(
          { user: { id: 'u-1', restaurantId: 'rest-1', role: 'dono' } } as never,
          'p-other'
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getMe / getMyProfiles / updateMe — endpoints do próprio user
  // ─────────────────────────────────────────────────────────────────
  describe('getMe', () => {
    it('retorna o usuário pelo id do JWT', async () => {
      mockUsersService.findById.mockResolvedValueOnce({ id: 'u-1', name: 'Eu' });

      const result = await controller.getMe({
        user: { id: 'u-1', restaurantId: 'rest-1', role: 'cliente' },
      } as never);

      expect(result).toEqual({ id: 'u-1', name: 'Eu' });
      expect(mockUsersService.findById).toHaveBeenCalledWith('u-1');
    });
  });

  describe('getMyProfiles', () => {
    it('retorna perfis do user pelo id do JWT', async () => {
      mockUsersService.getProfilesByUserId.mockResolvedValueOnce([
        { id: 'p-1', name: 'P1' },
      ]);

      const result = await controller.getMyProfiles({
        user: { id: 'u-1', restaurantId: 'rest-1', role: 'cliente' },
      } as never);

      expect(result).toHaveLength(1);
      expect(mockUsersService.getProfilesByUserId).toHaveBeenCalledWith('u-1');
    });
  });

  describe('updateMe', () => {
    it('chama updateOwnProfile (defesa contra self-escalation)', async () => {
      mockUsersService.updateOwnProfile.mockResolvedValueOnce({
        id: 'u-1',
        name: 'Novo',
      });

      const result = await controller.updateMe(
        { user: { id: 'u-1', restaurantId: 'rest-1', role: 'cliente' } } as never,
        { name: 'Novo' } as never
      );

      expect(result).toEqual({ id: 'u-1', name: 'Novo' });
      expect(mockUsersService.updateOwnProfile).toHaveBeenCalledWith('u-1', { name: 'Novo' });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // LGPD endpoints (já cobertos pelo spec principal, mas smoke-tested aqui)
  // ─────────────────────────────────────────────────────────────────
  describe('LGPD endpoints (smoke)', () => {
    it('exportMe delega ao LgpdService', async () => {
      mockLgpdService.exportUserData.mockResolvedValueOnce({ subject: {} });
      const result = await controller.exportMe({
        user: { id: 'u-1', restaurantId: 'rest-1', role: 'cliente' },
      } as never);
      expect(result).toEqual({ subject: {} });
      expect(mockLgpdService.exportUserData).toHaveBeenCalledWith('u-1');
    });

    it('deleteMe delega ao LgpdService', async () => {
      mockLgpdService.anonymizeOwnAccount.mockResolvedValueOnce({ success: true });
      const result = await controller.deleteMe({
        user: { id: 'u-1', restaurantId: 'rest-1', role: 'cliente' },
      } as never);
      expect(result).toEqual({ success: true });
      expect(mockLgpdService.anonymizeOwnAccount).toHaveBeenCalledWith('u-1');
    });
  });
});
