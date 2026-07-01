import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProductsService } from '../../../src/products/products.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('ProductsService', () => {
  let productsService: ProductsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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

      expect(result.data).toEqual(mockProducts);
      expect(result.nextCursor).toBeNull();
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat-1', available: true },
        })
      );
    });

    it('should return empty page when no products found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await productsService.findByCategory('cat-empty');

      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it('should expose nextCursor when more pages exist', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        sortOrder: i,
      }));
      mockPrisma.product.findMany.mockResolvedValue(items);

      const result = await productsService.findByCategory('cat-1', { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe('p19');
    });

    it('inclui produtos indisponíveis quando includeUnavailable=true', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      await productsService.findByCategory('cat-1', { includeUnavailable: true });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoryId: 'cat-1' } })
      );
    });
  });

  describe('findByRestaurant', () => {
    it('should return hierarchical structure grouped by category', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Bebidas',
          sortOrder: 0,
          products: [
            { id: 'p1', name: 'Product 1' },
            { id: 'p2', name: 'Product 2' },
          ],
        },
        {
          id: 'cat-2',
          name: 'Pratos',
          sortOrder: 1,
          products: [{ id: 'p3', name: 'Product 3' }],
        },
      ];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await productsService.findByRestaurant('rest-1');

      expect(result.restaurantId).toBe('rest-1');
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].id).toBe('cat-1');
      expect(result.categories[0].name).toBe('Bebidas');
      expect(result.categories[0].products).toHaveLength(2);
      expect(result.categories[1].products).toHaveLength(1);
    });

    it('should return empty categories when restaurant has none', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await productsService.findByRestaurant('rest-empty');

      expect(result.restaurantId).toBe('rest-empty');
      expect(result.categories).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      const mockProduct = { id: 'p1', name: 'Product 1', price: 1990 };
      // C-NEW-01: findById agora usa `findFirst` filtrando restaurant.active.
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await productsService.findById('p1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

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
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          categoryId: createData.categoryId,
          name: createData.name,
          description: createData.description,
          imageUrl: createData.imageUrl,
          price: createData.price,
          dietaryLabels: createData.dietaryLabels,
          sortOrder: createData.sortOrder,
        },
      });
    });

    it('should create product with only required fields', async () => {
      const createData = { categoryId: 'cat-1', name: 'Minimal', price: 1000 };
      mockPrisma.product.create.mockResolvedValue({ id: 'p-min', ...createData });

      const result = await productsService.create(createData);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          categoryId: createData.categoryId,
          name: createData.name,
          description: undefined,
          imageUrl: undefined,
          price: createData.price,
          dietaryLabels: undefined,
          sortOrder: 0,
        },
      });
    });

    it('lança ForbiddenException se categoria pertence a outro restaurante', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ restaurantId: 'other-rest' });

      await expect(
        productsService.create({
          categoryId: 'cat-1',
          restaurantId: 'rest-1',
          name: 'X',
          price: 1000,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('lança ForbiddenException se categoria não existe', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        productsService.create({
          categoryId: 'ghost',
          restaurantId: 'rest-1',
          name: 'X',
          price: 1000,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('pula validação de ownership se requesterRestaurantId ausente', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 'p-new' });

      await productsService.create({ categoryId: 'cat-1', name: 'X', price: 1000 });

      // Sem lookup de category para validar.
      expect(mockPrisma.category.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('createWithRestaurant', () => {
    it('usa categoryId quando fornecido', async () => {
      mockPrisma.product.create.mockResolvedValue({ id: 'p-new' });

      await productsService.createWithRestaurant({
        categoryId: 'cat-1',
        name: 'X',
        price: 1000,
      });

      expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.product.create).toHaveBeenCalled();
    });

    it('busca primeira categoria do restaurante se categoryId ausente', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'cat-default',
        restaurantId: 'rest-1',
      });
      mockPrisma.category.findUnique.mockResolvedValue({ restaurantId: 'rest-1' });
      mockPrisma.product.create.mockResolvedValue({ id: 'p-new' });

      await productsService.createWithRestaurant({
        restaurantId: 'rest-1',
        name: 'X',
        price: 1000,
      });

      expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
        where: { restaurantId: 'rest-1', deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ categoryId: 'cat-default' }) })
      );
    });

    it('lança NotFoundException se restaurante sem categoria', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        productsService.createWithRestaurant({
          restaurantId: 'rest-empty',
          name: 'X',
          price: 1000,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException se sem categoryId nem restaurantId', async () => {
      await expect(
        productsService.createWithRestaurant({ name: 'X', price: 1000 })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      const updateData = { name: 'Updated Name', price: 3990 };
      const mockUpdated = { id: 'p1', ...updateData };
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        category: { restaurantId: 'rest-1' },
      });
      mockPrisma.product.update.mockResolvedValue(mockUpdated);

      const result = await productsService.update('p1', updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: updateData,
      });
    });

    it('should update product availability', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        category: { restaurantId: 'rest-1' },
      });
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', available: false });

      const result = await productsService.update('p1', { available: false });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { available: false },
      });
    });

    it('should allow partial updates with single field', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        category: { restaurantId: 'rest-1' },
      });
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', name: 'Only Name Changed' });

      const result = await productsService.update('p1', { name: 'Only Name Changed' });

      expect(result.name).toBe('Only Name Changed');
    });

    it('lança NotFoundException se produto não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(productsService.update('ghost', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('lança ForbiddenException se produto pertence a outro restaurante', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        category: { restaurantId: 'other-rest' },
      });

      await expect(productsService.update('p1', { name: 'X' }, 'rest-1')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('delete', () => {
    it('should delete product successfully', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        category: { restaurantId: 'rest-1' },
      });
      mockPrisma.product.delete.mockResolvedValue({ id: 'p1' });

      await expect(productsService.delete('p1')).resolves.toBeUndefined();
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('lança NotFoundException se produto não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(productsService.delete('ghost')).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException se produto pertence a outro restaurante', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        category: { restaurantId: 'other-rest' },
      });

      await expect(productsService.delete('p1', 'rest-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
