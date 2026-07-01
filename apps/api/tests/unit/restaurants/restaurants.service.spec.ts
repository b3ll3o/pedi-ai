import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    usersProfile: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
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

  describe('findByIds', () => {
    it('filtra active quando activeOnly=true', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([{ id: 'r1' }]);

      await restaurantsService.findByIds(['r1'], { activeOnly: true });

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['r1'] }, active: true },
        })
      );
    });

    it('não filtra active quando activeOnly=false (chamadas internas)', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);

      await restaurantsService.findByIds(['r1', 'r2'], { activeOnly: false });

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['r1', 'r2'] } },
        })
      );
    });

    it('omite activeOnly mesmo sem options', async () => {
      mockPrisma.restaurant.findMany.mockResolvedValue([]);

      await restaurantsService.findByIds(['r1']);

      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['r1'] } },
        })
      );
    });
  });

  describe('findByUserId', () => {
    it('retorna [] quando usuário não tem perfis', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([]);

      const result = await restaurantsService.findByUserId('user-1');

      expect(result).toEqual([]);
      expect(mockPrisma.restaurant.findMany).not.toHaveBeenCalled();
    });

    it('filtra perfis sem restaurantId e busca os restaurantes', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([
        { restaurantId: 'r1' },
        { restaurantId: null },
        { restaurantId: 'r2' },
      ]);
      mockPrisma.restaurant.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);

      const result = await restaurantsService.findByUserId('user-1');

      expect(result).toEqual([{ id: 'r1' }, { id: 'r2' }]);
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalled();
    });
  });

  describe('findByUserWithTeamCount', () => {
    it('retorna [] quando usuário não tem perfis com restaurantId', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([{ restaurantId: null }]);

      const result = await restaurantsService.findByUserWithTeamCount('user-1');

      expect(result).toEqual([]);
    });

    it('consolida restaurantes + roleMap + teamCount', async () => {
      mockPrisma.usersProfile.findMany
        .mockResolvedValueOnce([
          { restaurantId: 'r1', role: 'dono' },
          { restaurantId: 'r2', role: 'gerente' },
        ])
        .mockResolvedValueOnce(undefined); // segunda chamada não esperada

      mockPrisma.restaurant.findMany.mockResolvedValue([
        { id: 'r1', name: 'Rest 1' },
        { id: 'r2', name: 'Rest 2' },
      ]);
      mockPrisma.usersProfile.groupBy.mockResolvedValue([
        { restaurantId: 'r1', _count: { _all: 5 } },
        { restaurantId: 'r2', _count: { _all: 2 } },
      ]);

      const result = await restaurantsService.findByUserWithTeamCount('user-1');

      expect(result).toEqual([
        { id: 'r1', name: 'Rest 1', role: 'dono', teamCount: 5 },
        { id: 'r2', name: 'Rest 2', role: 'gerente', teamCount: 2 },
      ]);
    });

    it('defaults role para "cliente" e teamCount para 0 quando ausente nos maps', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: 'r1', role: 'dono' },
      ]);
      mockPrisma.restaurant.findMany.mockResolvedValue([{ id: 'r1', name: 'R1' }]);
      mockPrisma.usersProfile.groupBy.mockResolvedValue([]);

      const result = await restaurantsService.findByUserWithTeamCount('user-1');

      expect(result).toEqual([{ id: 'r1', name: 'R1', role: 'dono', teamCount: 0 }]);
    });

    it('filtra perfis com restaurantId null/empty', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: null, role: 'cliente' },
        { restaurantId: '', role: 'cliente' },
      ]);

      const result = await restaurantsService.findByUserWithTeamCount('user-1');

      expect(result).toEqual([]);
    });

    it('deduplica restaurantIds ao consolidar perfis repetidos', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: 'r1', role: 'gerente' },
        { restaurantId: 'r1', role: 'dono' }, // mesmo restaurante, último role vence
      ]);
      mockPrisma.restaurant.findMany.mockResolvedValue([{ id: 'r1', name: 'R1' }]);
      mockPrisma.usersProfile.groupBy.mockResolvedValue([
        { restaurantId: 'r1', _count: { _all: 10 } },
      ]);

      const result = await restaurantsService.findByUserWithTeamCount('user-1');

      expect(result).toEqual([{ id: 'r1', name: 'R1', role: 'dono', teamCount: 10 }]);
    });
  });

  describe('findByUserIdWithTrial', () => {
    it('retorna [] quando usuário não tem perfis "dono"', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([]);

      const result = await restaurantsService.findByUserIdWithTrial('user-1');

      expect(result).toEqual([]);
      expect(mockPrisma.restaurant.findMany).not.toHaveBeenCalled();
    });

    it('filtra perfis não-dono antes de buscar restaurantes', async () => {
      // apenas profiles com role='dono' são retornados pelo findMany com role='dono'
      mockPrisma.usersProfile.findMany.mockResolvedValue([]);
      mockPrisma.restaurant.findMany.mockResolvedValue([]);

      await restaurantsService.findByUserIdWithTrial('user-1');

      expect(mockPrisma.usersProfile.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', role: 'dono' },
        select: { restaurantId: true },
      });
    });

    it('busca restaurantes ativos com subscription trialing válida', async () => {
      mockPrisma.usersProfile.findMany.mockResolvedValue([{ restaurantId: 'r1' }]);
      mockPrisma.restaurant.findMany.mockResolvedValue([{ id: 'r1' }]);

      const result = await restaurantsService.findByUserIdWithTrial('user-1');

      expect(result).toEqual([{ id: 'r1' }]);
    });
  });

  describe('createWithOwner', () => {
    it('cria restaurante + owner + subscription trial 14 dias via $transaction', async () => {
      const mockRestaurant = { id: 'r-new', name: 'New R' };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
        fn(mockPrisma)
      );
      mockPrisma.restaurant.create.mockResolvedValue(mockRestaurant);
      mockPrisma.usersProfile.create.mockResolvedValue({});
      mockPrisma.subscription.create.mockResolvedValue({});

      const result = await restaurantsService.createWithOwner({
        name: 'New R',
        ownerId: 'u-1',
        ownerEmail: 'owner@example.com',
        ownerName: 'João',
      });

      expect(result).toEqual(mockRestaurant);
      expect(mockPrisma.restaurant.create).toHaveBeenCalled();
      expect(mockPrisma.usersProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u-1',
            restaurantId: 'r-new',
            email: 'owner@example.com',
            name: 'João',
            role: 'dono',
          }),
        })
      );
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            restaurantId: 'r-new',
            status: 'trialing',
            planType: 'monthly',
            priceCents: 1999,
            trialDays: 14,
          }),
        })
      );
    });

    it('aceita ownerRole customizado (não-dono)', async () => {
      const mockRestaurant = { id: 'r-new', name: 'New R' };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
        fn(mockPrisma)
      );
      mockPrisma.restaurant.create.mockResolvedValue(mockRestaurant);
      mockPrisma.usersProfile.create.mockResolvedValue({});
      mockPrisma.subscription.create.mockResolvedValue({});

      await restaurantsService.createWithOwner({
        name: 'New R',
        ownerId: 'u-1',
        ownerEmail: 'staff@example.com',
        ownerRole: 'gerente',
      });

      expect(mockPrisma.usersProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'gerente' }),
        })
      );
    });

    it('fallback ownerName → parte local do email → "User"', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
        fn(mockPrisma)
      );
      mockPrisma.restaurant.create.mockResolvedValue({ id: 'r-new' });
      mockPrisma.usersProfile.create.mockResolvedValue({});
      mockPrisma.subscription.create.mockResolvedValue({});

      // sem ownerName → usa parte local do email
      await restaurantsService.createWithOwner({
        name: 'R',
        ownerId: 'u-1',
        ownerEmail: 'pedro123@gmail.com',
      });
      expect(mockPrisma.usersProfile.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'pedro123' }),
        })
      );

      // email vazio → "User" (parte local do email é string vazia, fallback ativado)
      mockPrisma.usersProfile.create.mockClear();
      await restaurantsService.createWithOwner({
        name: 'R',
        ownerId: 'u-2',
        ownerEmail: '@example.com',
      });
      expect(mockPrisma.usersProfile.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'User' }),
        })
      );
    });
  });

  describe('update — tratamento de erros', () => {
    it('converte Prisma P2025 em NotFoundException', async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      });
      mockPrisma.restaurant.update.mockRejectedValue(p2025);

      await expect(restaurantsService.update('non-existent', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('repropaga outros erros do Prisma', async () => {
      const genericError = new Error('connection lost');
      mockPrisma.restaurant.update.mockRejectedValue(genericError);

      await expect(restaurantsService.update('r1', {})).rejects.toThrow('connection lost');
    });
  });
});
