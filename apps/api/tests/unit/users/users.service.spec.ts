import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    usersProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    usersService = new UsersService(mockPrisma as unknown as PrismaService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User Name',
        role: 'cliente' as const,
      };
      mockPrisma.usersProfile.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.usersProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);

      await expect(usersService.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user when email matches', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User Name',
        role: 'cliente' as const,
      };
      mockPrisma.usersProfile.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findByEmail('user@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.usersProfile.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('should return null when no user matches email', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);

      const result = await usersService.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('M-04: updateRole removido', () => {
    // Auditoria M-04: `updateRole` foi removido do UsersService (código morto
    // + vetor latente de privilege escalation). Estes testes existem para
    // documentar a remoção e garantir que ninguém reintroduz o método sem
    // passar pelos guards adequados.
    it('should NOT expose updateRole method', () => {
      expect((usersService as unknown as { updateRole?: unknown }).updateRole).toBeUndefined();
    });
  });

  describe('findByRestaurant', () => {
    it('lista perfis por restaurante com paginação por cursor', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

      const result = await usersService.findByRestaurant('r1');

      expect(result.data).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(mockPrisma.usersProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: 'r1' },
        })
      );
    });

    it('filtra por role quando informado', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([]);
      await usersService.findByRestaurant('r1', { role: 'dono' });
      expect(mockPrisma.usersProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'r1', role: 'dono' } })
      );
    });

    it('expõe nextCursor quando há mais páginas (take: limit+1)', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({ id: `u${i}` }));
      mockPrisma.usersProfile.findMany.mockResolvedValue(items);

      const result = await usersService.findByRestaurant('r1', {}, { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe('u19');
    });
  });

  describe('createProfile', () => {
    it('cria perfil quando email não existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);
      mockPrisma.usersProfile.create.mockResolvedValue({ id: 'u-new' });

      const result = await usersService.createProfile({
        restaurantId: 'r1',
        email: 'a@b.com',
        name: 'A',
        role: 'cliente',
      });

      expect(result).toEqual({ id: 'u-new' });
      expect(mockPrisma.usersProfile.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'r1',
          email: 'a@b.com',
          name: 'A',
          role: 'cliente',
          userId: null,
        },
      });
    });

    it('lança ConflictException quando email já existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        usersService.createProfile({
          restaurantId: 'r1',
          email: 'taken@b.com',
          name: 'A',
          role: 'cliente',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile (admin) — tenant isolation', () => {
    const admin = { id: 'admin-1', restaurantId: 'r1', role: 'dono' as const };

    it('lança NotFoundException se perfil não existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);
      await expect(usersService.updateProfile('x', {}, admin)).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException se perfil pertence a outro restaurante', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'x',
        restaurantId: 'r2',
        role: 'cliente',
      });
      await expect(usersService.updateProfile('x', { name: 'Y' }, admin)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('lança ForbiddenException se promove a "dono" sem ser dono', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'x',
        restaurantId: 'r1',
        role: 'cliente',
      });
      const gerente = { id: 'g-1', restaurantId: 'r1', role: 'gerente' as const };
      await expect(usersService.updateProfile('x', { role: 'dono' }, gerente)).rejects.toThrow(
        /Apenas dono pode promover/
      );
    });

    it('lança ForbiddenException se auto-edita o próprio role', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'admin-1',
        restaurantId: 'r1',
        role: 'dono',
      });
      await expect(
        usersService.updateProfile('admin-1', { role: 'gerente' }, admin)
      ).rejects.toThrow(/próprio papel/);
    });

    it('atualiza perfil quando é outro usuário do mesmo tenant', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'u-x',
        restaurantId: 'r1',
        role: 'cliente',
      });
      mockPrisma.usersProfile.update.mockResolvedValue({ id: 'u-x', name: 'Updated' });

      const result = await usersService.updateProfile('u-x', { name: 'Updated' }, admin);

      expect(result).toEqual({ id: 'u-x', name: 'Updated' });
      expect(mockPrisma.usersProfile.update).toHaveBeenCalledWith({
        where: { id: 'u-x' },
        data: { name: 'Updated', email: undefined, role: 'cliente' },
      });
    });

    it('permite editar name sem mexer em email/role (preserva target)', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({
        id: 'u-x',
        restaurantId: 'r1',
        role: 'cliente',
        name: 'Old',
        email: 'a@b',
      });
      mockPrisma.usersProfile.update.mockResolvedValue({});

      await usersService.updateProfile('u-x', { name: 'New' }, admin);

      expect(mockPrisma.usersProfile.update).toHaveBeenCalledWith({
        where: { id: 'u-x' },
        data: { name: 'New', email: 'a@b', role: 'cliente' },
      });
    });
  });

  describe('deleteProfile', () => {
    it('lança NotFoundException se perfil não existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);
      await expect(usersService.deleteProfile('x', 'r1')).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException se restaurante diverge', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({ id: 'x', restaurantId: 'r2' });
      await expect(usersService.deleteProfile('x', 'r1')).rejects.toThrow(ForbiddenException);
    });

    it('deleta perfil quando restaurante bate', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({ id: 'x', restaurantId: 'r1' });
      mockPrisma.usersProfile.delete.mockResolvedValue({});

      const result = await usersService.deleteProfile('x', 'r1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.usersProfile.delete).toHaveBeenCalledWith({ where: { id: 'x' } });
    });
  });

  describe('updateOwnProfile', () => {
    it('rejeita role no body (defesa em profundidade)', async () => {
      await expect(usersService.updateOwnProfile('u-1', { role: 'dono' as never })).rejects.toThrow(
        /role/
      );
    });

    it('rejeita email no body', async () => {
      await expect(
        usersService.updateOwnProfile('u-1', { email: 'a@b.com' as never })
      ).rejects.toThrow(/email/);
    });

    it('rejeita restaurantId no body', async () => {
      await expect(
        usersService.updateOwnProfile('u-1', { restaurantId: 'r1' as never })
      ).rejects.toThrow(/restaurantId/);
    });

    it('lança NotFoundException se perfil não existe', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue(null);
      await expect(usersService.updateOwnProfile('u-1', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('atualiza apenas o nome (preserva o resto)', async () => {
      mockPrisma.usersProfile.findUnique.mockResolvedValue({ id: 'u-1', name: 'Old' });
      mockPrisma.usersProfile.update.mockResolvedValue({ id: 'u-1', name: 'New' });

      const result = await usersService.updateOwnProfile('u-1', { name: 'New' });

      expect(result).toEqual({ id: 'u-1', name: 'New' });
      expect(mockPrisma.usersProfile.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { name: 'New' },
      });
    });
  });

  describe('getProfilesByUserId', () => {
    it('retorna perfis + restaurant via include', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([{ id: 'p1' }]);

      const result = await usersService.getProfilesByUserId('u-1');

      expect(result).toEqual([{ id: 'p1' }]);
      expect(mockPrisma.usersProfile.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
        include: { restaurant: true },
      });
    });
  });
});
