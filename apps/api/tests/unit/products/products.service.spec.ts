import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from '../../../src/products/products.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('ProductsService', () => {
  let productsService: ProductsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    productsService = new ProductsService(mockPrisma as unknown as PrismaService);
  });

  describe('findByCategory', () => {
    it('should return products ordered by sortOrder', async () => {
      const mockProducts = [
        { id: 'p1', name: 'Product 1', sortOrder: 1 },
        { id: 'p2', name: 'Product 2', sortOrder: 2 },
      ];
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await productsService.findByCategory('cat-1');

      expect(result).toEqual(mockProducts);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return empty array when no products found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await productsService.findByCategory('cat-empty');

      expect(result).toEqual([]);
    });
  });

  describe('findByRestaurant', () => {
    it('should return all products from restaurant categories', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          products: [
            { id: 'p1', name: 'Product 1' },
            { id: 'p2', name: 'Product 2' },
          ],
        },
        {
          id: 'cat-2',
          products: [{ id: 'p3', name: 'Product 3' }],
        },
      ];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await productsService.findByRestaurant('rest-1');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Product 1');
      expect(result[2].name).toBe('Product 3');
    });

    it('should return empty array when restaurant has no categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await productsService.findByRestaurant('rest-empty');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      const mockProduct = { id: 'p1', name: 'Product 1', price: 1990 };
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await productsService.findById('p1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productsService.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const createData = {
        categoryId: 'cat-1',
        name: 'New Product',
        description: 'Delicious item',
        price: 2990,
        sortOrder: 5,
      };
      const mockCreated = { id: 'p-new', ...createData };
      mockPrisma.product.create.mockResolvedValue(mockCreated);

      const result = await productsService.create(createData);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.product.create).toHaveBeenCalledWith({ data: createData });
    });

    it('should create product with only required fields', async () => {
      const createData = { categoryId: 'cat-1', name: 'Minimal', price: 1000 };
      mockPrisma.product.create.mockResolvedValue({ id: 'p-min', ...createData });

      const result = await productsService.create(createData);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({ data: createData });
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      const updateData = { name: 'Updated Name', price: 3990 };
      const mockUpdated = { id: 'p1', ...updateData };
      mockPrisma.product.update.mockResolvedValue(mockUpdated);

      const result = await productsService.update('p1', updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: updateData,
      });
    });

    it('should update product availability', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', available: false });

      const result = await productsService.update('p1', { available: false });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { available: false },
      });
    });

    it('should allow partial updates with single field', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', name: 'Only Name Changed' });

      const result = await productsService.update('p1', { name: 'Only Name Changed' });

      expect(result.name).toBe('Only Name Changed');
    });
  });

  describe('delete', () => {
    it('should delete product successfully', async () => {
      mockPrisma.product.delete.mockResolvedValue({ id: 'p1' });

      await expect(productsService.delete('p1')).resolves.toBeUndefined();
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });
});
