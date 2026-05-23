import { describe, it, expect, vi, beforeEach } from 'vitest';

import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

// Mock the session module
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn<
    () => Promise<{
      user: { id: string; email: string; role: string; restaurantId?: string };
    } | null>
  >(),
}));

import { getSession } from '@/lib/auth/session';

describe('admin auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('deve retornar AuthUser quando sessão válida', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'owner@restaurante.com',
          role: 'dono',
          restaurantId: 'rest-456',
        },
      });

      const user = await requireAuth();

      expect(user).toEqual({
        id: 'user-123',
        email: 'owner@restaurante.com',
        role: 'dono',
        restaurant_id: 'rest-456',
      });
    });

    it('deve lançar erro quando sem sessão', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow('Não autenticado');
    });

    it('deve lançar erro quando usuário sem restaurante', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com', role: 'dono' },
      });

      await expect(requireAuth()).rejects.toThrow('Usuário sem restaurante asociado');
    });
  });

  describe('requireRole', () => {
    it('deve permitir usuário com role autorizada', () => {
      const user = { id: '1', email: 'a@b.com', role: 'dono' as const, restaurant_id: 'r1' };
      expect(() => requireRole(user, ['dono', 'gerente'])).not.toThrow();
    });

    it('deve lançar erro 403 para role não autorizada', () => {
      const user = { id: '1', email: 'a@b.com', role: 'atendente' as const, restaurant_id: 'r1' };
      expect(() => requireRole(user, ['dono', 'gerente'])).toThrow();
      try {
        requireRole(user, ['dono', 'gerente']);
      } catch (e: any) {
        expect(e.status).toBe(403);
      }
    });
  });

  describe('getRestaurantId', () => {
    it('deve retornar restaurant_id do usuário', () => {
      const user = { id: '1', email: 'a@b.com', role: 'dono' as const, restaurant_id: 'rest-123' };
      expect(getRestaurantId(user)).toBe('rest-123');
    });
  });
});
