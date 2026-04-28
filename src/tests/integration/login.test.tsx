/**
 * Testes de Integração: Fluxo de Login
 *
 * Cenários:
 * 1. Login com credenciais válidas chama onSubmit
 * 2. Login com credenciais inválidas exibe mensagem de erro
 * 3. Validação de email vazio
 * 4. Validação de senha vazia
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import React from 'react';

import { LoginForm } from '@/components/auth/LoginForm';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockOnSubmit = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  signUp: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
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

// ── Setup / Teardown ─────────────────────────────────────────────────────

describe('LoginForm — Fluxo de Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockReset();
    mockOnSubmit.mockResolvedValue(undefined);
    mockRouterPush.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Cenário 1: Login com credenciais válidas', () => {
    it('DEVE chamar onSubmit com email e senha corretos', async () => {
      const { getByTestId } = render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(getByTestId('email-input'), { target: { value: 'usuario@test.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.click(getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('usuario@test.com', 'senha123');
      });
    });
  });

  describe('Cenário 2: Login com credenciais inválidas', () => {
    it('DEVE exibir mensagem de erro quando onSubmit lança erro', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Email ou senha incorretos'));

      const { getByTestId, queryByTestId } = render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(getByTestId('email-input'), { target: { value: 'errado@test.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'senhaerrada' } });
      fireEvent.click(getByTestId('login-button'));

      await waitFor(() => {
        const errorEl = queryByTestId('error-message');
        expect(errorEl).toBeInTheDocument();
        expect(errorEl).toHaveTextContent('Email ou senha incorretos');
      });
    });
  });

  describe('Cenário 3: Validação de formulário', () => {
    it('DEVE mostrar erro quando email está vazio', async () => {
      const { getByTestId } = render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.click(getByTestId('login-button'));

      await waitFor(() => {
        const errors = document.querySelectorAll('[data-testid="field-error"]');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toHaveTextContent('Email é obrigatório');
      });
    });

    it('DEVE mostrar erro quando senha está vazia', async () => {
      const { getByTestId } = render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.click(getByTestId('login-button'));

      await waitFor(() => {
        const errors = document.querySelectorAll('[data-testid="field-error"]');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toHaveTextContent('Senha é obrigatória');
      });
    });

    it('DEVE mostrar erro quando email é inválido', async () => {
      const { getByTestId } = render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(getByTestId('email-input'), { target: { value: 'email-invalido' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.click(getByTestId('login-button'));

      await waitFor(() => {
        const errors = document.querySelectorAll('[data-testid="field-error"]');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toHaveTextContent('Por favor, insira um email válido');
      });
    });

    it('DEVE mostrar erro quando senha tem menos de 6 caracteres', async () => {
      const { getByTestId } = render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: '12345' } });
      fireEvent.click(getByTestId('login-button'));

      await waitFor(() => {
        const errors = document.querySelectorAll('[data-testid="field-error"]');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toHaveTextContent('Senha deve ter pelo menos 6 caracteres');
      });
    });
  });

  describe('Cenário 4: Estados de Loading', () => {
    it('DEVE desabilitar campos durante submit', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByTestId } = render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.click(getByTestId('login-button'));

      // Imediatamente após click, campos devem estar desabilitados
      expect(getByTestId('email-input')).toBeDisabled();
      expect(getByTestId('password-input')).toBeDisabled();
    });
  });
});
