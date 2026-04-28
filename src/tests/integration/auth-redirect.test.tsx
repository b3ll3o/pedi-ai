/**
 * Testes de Integração: Fluxo de Redirecionamento por Role via API /api/auth/profile
 *
 * Valida:
 * 1. Profile com role="dono" e restaurant_id=null → /admin/restaurants/new
 * 2. Profile com role="dono" e restaurant_id definido → /admin/dashboard
 * 3. Profile com role="cliente" → /menu
 * 4. Profile não encontrado → /menu
 * 5. userId null → /menu imediatamente (sem chamada à API)
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

// Componente de teste que usa o hook useRedirectByRole
import { useRedirectByRole, type UseRedirectByRoleResult } from '@/hooks/useRedirectByRole';

// ── Mock de next/navigation ──────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
  useEffect: React.useEffect,
}));

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ProfileResponse {
  role: string;
  restaurant_id: string | null;
}

interface ErrorResponse {
  error: string;
}

type ApiResponse = ProfileResponse | ErrorResponse;

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockFetch(profile: ProfileResponse | null, shouldFail = false) {
  return vi.fn((url: string) => {
    if (url !== '/api/auth/profile') {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    }

    if (shouldFail || profile === null) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Profile not found' }),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(profile),
    });
  });
}

// Componente wrapper para testar o hook
function TestComponent({
  userId,
  isAuthenticated = false,
}: {
  userId: string | null;
  isAuthenticated?: boolean;
}) {
  const result = useRedirectByRole(userId, isAuthenticated);

  return (
    <div>
      <span data-testid="destination">{result.destination}</span>
      <span data-testid="role">{result.role ?? 'null'}</span>
      <span data-testid="isLoading">{result.isLoading ? 'true' : 'false'}</span>
    </div>
  );
}

// ── Setup / Teardown ────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-123';

describe('auth-redirect: Redirecionamento por Role via /api/auth/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Cenário 1: Profile com role="dono" e restaurant_id=null', () => {
    it('DEVE redirecionar para /admin/restaurants/new (NÃO /menu)', async () => {
      // Arrange: Mock de fetch retornando profile de dono sem restaurante
      const mockProfile: ProfileResponse = {
        role: 'dono',
        restaurant_id: null,
      };

      vi.stubGlobal('fetch', createMockFetch(mockProfile));

      // Act
      const { getByTestId } = render(
        <TestComponent userId={TEST_USER_ID} isAuthenticated={true} />
      );

      // Assert: Aguardar resultado e verificar redirecionamento correto
      await waitFor(
        () => {
          expect(getByTestId('destination').textContent).toBe('/admin/restaurants/new');
        },
        { timeout: 3000 }
      );

      // Verificar que NÃO redireciona para /menu
      expect(getByTestId('destination').textContent).not.toBe('/menu');

      // Verificar role está correto
      expect(getByTestId('role').textContent).toBe('dono');

      // Verificar que isLoading virou false
      expect(getByTestId('isLoading').textContent).toBe('false');
    });
  });

  describe('Cenário 2: Profile com role="dono" e restaurant_id definido', () => {
    it('DEVE redirecionar para /admin/dashboard', async () => {
      // Arrange: Mock de fetch retornando profile de dono COM restaurante
      const mockProfile: ProfileResponse = {
        role: 'dono',
        restaurant_id: 'restaurante-456',
      };

      vi.stubGlobal('fetch', createMockFetch(mockProfile));

      // Act
      const { getByTestId } = render(
        <TestComponent userId={TEST_USER_ID} isAuthenticated={true} />
      );

      // Assert
      await waitFor(
        () => {
          expect(getByTestId('destination').textContent).toBe('/admin/dashboard');
        },
        { timeout: 3000 }
      );

      expect(getByTestId('role').textContent).toBe('dono');
    });
  });

  describe('Cenário 3: Profile com role="cliente"', () => {
    it('DEVE redirecionar para /menu', async () => {
      // Arrange
      const mockProfile: ProfileResponse = {
        role: 'cliente',
        restaurant_id: null,
      };

      vi.stubGlobal('fetch', createMockFetch(mockProfile));

      // Act
      const { getByTestId } = render(
        <TestComponent userId={TEST_USER_ID} isAuthenticated={true} />
      );

      // Assert
      await waitFor(
        () => {
          expect(getByTestId('destination').textContent).toBe('/menu');
        },
        { timeout: 3000 }
      );

      expect(getByTestId('role').textContent).toBe('cliente');
    });
  });

  describe('Cenário 4: userId=null', () => {
    it('DEVE retornar /menu imediatamente (sem chamada à API)', async () => {
      // Arrange: Mock de fetch que falha para detectar se foi chamado
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Should not be called' }),
      });

      vi.stubGlobal('fetch', mockFetch);

      // Act
      const { getByTestId } = render(
        <TestComponent userId={null} isAuthenticated={false} />
      );

      // Assert: Estado inicial deve ser /menu
      expect(getByTestId('destination').textContent).toBe('/menu');

      // Verificar que fetch NÃO foi chamado (retorno early)
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Cenário 5: Profile não encontrado (erro)', () => {
    it('DEVE redirecionar para /menu quando profile não existe', async () => {
      // Arrange: Mock de fetch retornando erro 404
      vi.stubGlobal('fetch', createMockFetch(null, true));

      // Act
      const { getByTestId } = render(
        <TestComponent userId={TEST_USER_ID} isAuthenticated={true} />
      );

      // Assert
      await waitFor(
        () => {
          expect(getByTestId('destination').textContent).toBe('/menu');
        },
        { timeout: 3000 }
      );

      expect(getByTestId('role').textContent).toBe('null');
    });
  });

  describe('Cenário 6: Fluxo completo - Registro + Login', () => {
    it('DEVE redirecionar para /admin/restaurants/new após registro com intent=gerenciar_restaurante', async () => {
      // Arrange: Profile de dono sem restaurante (resultado esperado do registro)
      const mockProfile: ProfileResponse = {
        role: 'dono',
        restaurant_id: null,
      };

      vi.stubGlobal('fetch', createMockFetch(mockProfile));

      // Act: Simular login com profile já criado
      const { getByTestId } = render(
        <TestComponent userId={TEST_USER_ID} isAuthenticated={true} />
      );

      // Assert: O fluxo completo deveria resultar em /admin/restaurants/new
      await waitFor(
        () => {
          expect(getByTestId('destination').textContent).toBe('/admin/restaurants/new');
        },
        { timeout: 3000 }
      );

      // Confirma que é um dono sem restaurante
      expect(getByTestId('role').textContent).toBe('dono');
    });
  });
});
