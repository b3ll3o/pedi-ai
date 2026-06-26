import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../../../src/categories/categories.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('CategoriesService', () => {
  let categoriesService: CategoriesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    categoriesService = new CategoriesService(mockPrisma as unknown as PrismaService);
  });

  describe('findByRestaurant', () => {
    it('should return categories ordered by sortOrder', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Appetizers', sortOrder: 1 },
        { id: 'cat-2', name: 'Main Course', sortOrder: 2 },
        { id: 'cat-3', name: 'Desserts', sortOrder: 3 },
      ];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await categoriesService.findByRestaurant('rest-1');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Appetizers');
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          restaurantId: 'rest-1',
          deletedAt: null,
          restaurant: { active: true },
        },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return empty array when no categories found', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await categoriesService.findByRestaurant('rest-empty');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      const mockCategory = { id: 'cat-1', name: 'Appetizers' };
      // C-NEW-01: findById usa findFirst com filtro restaurant.active.
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);

      const result = await categoriesService.findById('cat-1');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(categoriesService.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create category successfully', async () => {
      const createData = {
        restaurantId: 'rest-1',
        name: 'New Category',
        description: 'Delicious items',
        sortOrder: 3,
      };
      const mockCreated = { id: 'cat-new', ...createData };
      mockPrisma.category.create.mockResolvedValue(mockCreated);

      const result = await categoriesService.create(createData);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: createData });
    });

    it('should create category with only required fields', async () => {
      const createData = { restaurantId: 'rest-1', name: 'Minimal' };
      mockPrisma.category.create.mockResolvedValue({ id: 'cat-min', ...createData });

      const result = await categoriesService.create(createData);

      expect(result.name).toBe('Minimal');
    });
  });

  describe('update', () => {
    it('should update category successfully', async () => {
      const updateData = { name: 'Updated Name', sortOrder: 5 };
      const mockUpdated = { id: 'cat-1', ...updateData };
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        restaurantId: 'rest-1',
        deletedAt: null,
      });
      mockPrisma.category.update.mockResolvedValue(mockUpdated);

      const result = await categoriesService.update('cat-1', updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: updateData,
      });
    });

    it('should update category active status', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        restaurantId: 'rest-1',
        deletedAt: null,
      });
      mockPrisma.category.update.mockResolvedValue({ id: 'cat-1', active: false });

      const result = await categoriesService.update('cat-1', { active: false });

      expect(result.active).toBe(false);
    });
  });

  describe('delete', () => {
    it('should soft delete category by setting deletedAt', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        restaurantId: 'rest-1',
        deletedAt: null,
      });
      mockPrisma.category.update.mockResolvedValue({ id: 'cat-1', deletedAt: new Date() });

      await categoriesService.delete('cat-1');

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('reorder', () => {
    it('should reorder multiple categories via transaction', async () => {
      const reorderData = [
        { id: 'cat-1', sortOrder: 1 },
        { id: 'cat-2', sortOrder: 2 },
        { id: 'cat-3', sortOrder: 3 },
      ];
      mockPrisma.category.update.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([]);

      await categoriesService.reorder(reorderData);

      // Auditoria M5: deve usar $transaction (atomicidade), não Promise.all.
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // O array passado para $transaction deve conter 3 updates.
      const txArg = mockPrisma.$transaction.mock.calls[0][0];
      expect(txArg).toHaveLength(3);
    });

    it('should reorder single category via transaction', async () => {
      mockPrisma.category.update.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([]);

      await categoriesService.reorder([{ id: 'cat-1', sortOrder: 10 }]);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const txArg = mockPrisma.$transaction.mock.calls[0][0];
      expect(txArg).toHaveLength(1);
    });
  });
});
