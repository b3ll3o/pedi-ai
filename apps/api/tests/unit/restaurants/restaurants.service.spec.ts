import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RestaurantsService } from '../../../src/restaurants/restaurants.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('RestaurantsService', () => {
  let restaurantsService: RestaurantsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    restaurant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    restaurantsService = new RestaurantsService(mockPrisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('should return only active restaurants by default', async () => {
      const mockRestaurants = [
        { id: 'r1', name: 'Restaurant 1', active: true },
        { id: 'r2', name: 'Restaurant 2', active: true },
      ];
      mockPrisma.restaurant.findMany.mockResolvedValue(mockRestaurants);

      const result = await restaurantsService.findAll();

      expect(result.data).toEqual(mockRestaurants);
      expect(result.nextCursor).toBeNull();
      expect(result.count).toBe(2);
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } })
      );
    });

    it('should return all restaurants when active=false', async () => {
      const mockRestaurants = [
        { id: 'r1', name: 'Restaurant 1', active: true },
        { id: 'r2', name: 'Restaurant 2', active: false },
      ];
      mockPrisma.restaurant.findMany.mockResolvedValue(mockRestaurants);

      const result = await restaurantsService.findAll(false);

      expect(result.data).toHaveLength(2);
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined })
      );
    });

    it('should return empty page when no restaurants', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([]);

      const result = await restaurantsService.findAll();

      expect(result.data).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it('should expose nextCursor when more pages exist', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `r${i}`,
        name: `R${i}`,
        active: true,
      }));
      mockPrisma.restaurant.findMany.mockResolvedValue(items);

      const result = await restaurantsService.findAll(true, { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe('r19');
    });
  });

  describe('findById', () => {
    it('should return restaurant when found', async () => {
      const mockRestaurant = { id: 'r1', name: 'Restaurant 1' };
      // C-NEW-01: findById usa findFirst com filtro active: true.
      mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);

      const result = await restaurantsService.findById('r1');

      expect(result).toEqual(mockRestaurant);
      expect(mockPrisma.restaurant.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', active: true },
      });
    });

    it('should throw NotFoundException when restaurant not found', async () => {
      mockPrisma.restaurant.findFirst.mockResolvedValue(null);

      await expect(restaurantsService.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return restaurant when slug matches', async () => {
      const mockRestaurant = { id: 'r1', name: 'Restaurant 1', slug: 'rest-1' };
      // C-NEW-01: findBySlug filtra active: true em rotas públicas.
      mockPrisma.restaurant.findFirst.mockResolvedValue(mockRestaurant);

      const result = await restaurantsService.findBySlug('rest-1');

      expect(result).toEqual(mockRestaurant);
      expect(mockPrisma.restaurant.findFirst).toHaveBeenCalledWith({
        where: { slug: 'rest-1', active: true },
      });
    });

    it('should return null when no restaurant matches slug', async () => {
      mockPrisma.restaurant.findFirst.mockResolvedValue(null);

      const result = await restaurantsService.findBySlug('unknown-slug');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create restaurant successfully', async () => {
      const createData = {
        name: 'New Restaurant',
        slug: 'new-restaurant',
        description: 'Best food in town',
      };
      const mockCreated = { id: 'r-new', ...createData, active: true };
      mockPrisma.restaurant.create.mockResolvedValue(mockCreated);

      const result = await restaurantsService.create(createData);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.restaurant.create).toHaveBeenCalledWith({ data: createData });
    });

    it('should create restaurant with only required fields', async () => {
      const createData = { name: 'Minimal Restaurant' };
      mockPrisma.restaurant.create.mockResolvedValue({ id: 'r-min', ...createData, active: true });

      const result = await restaurantsService.create(createData);

      expect(result.name).toBe('Minimal Restaurant');
    });
  });

  describe('update', () => {
    it('should update restaurant successfully', async () => {
      const updateData = { name: 'Updated Name', address: 'New Address' };
      const mockUpdated = { id: 'r1', ...updateData };
      mockPrisma.restaurant.update.mockResolvedValue(mockUpdated);

      const result = await restaurantsService.update('r1', updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: updateData,
      });
    });

    it('should update restaurant active status', async () => {
      mockPrisma.restaurant.update.mockResolvedValue({ id: 'r1', active: false });

      const result = await restaurantsService.update('r1', { active: false });

      expect(result.active).toBe(false);
    });

    it('should update restaurant settings', async () => {
      const settings = JSON.stringify({ theme: 'dark', currency: 'BRL' });
      mockPrisma.restaurant.update.mockResolvedValue({ id: 'r1', settings });

      const result = await restaurantsService.update('r1', { settings });

      expect(result.settings).toBe(settings);
    });
  });

  describe('deactivate', () => {
    it('should deactivate restaurant', async () => {
      mockPrisma.restaurant.update.mockResolvedValue({ id: 'r1', active: false });

      const result = await restaurantsService.deactivate('r1');

      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { active: false },
      });
    });
  });
});
