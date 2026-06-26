import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    usersProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
});
