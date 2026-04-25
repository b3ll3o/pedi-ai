import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

import { RegisterForm } from '@/components/auth/RegisterForm';

// ── Mocks ──────────────────────────────────────────────────────────────

const mockSignUpFn = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  signUp: (...args: unknown[]) => mockSignUpFn(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/register',
  useSearchParams: () => new URLSearchParams(),
  useEffect: React.useEffect,
}));

// ── Setup / Teardown ──────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  mockSignUpFn.mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('RegisterForm — loading state (bug fix verification)', () => {
  /**
   * Bug: quando o registro falhava, o finally block não existia e o botão
   * ficava permanentemente desabilitado.
   *
   * Fix: adição do finally { setIsLoading(false); } no handleSubmit.
   */

  it('botão NÃO está desabilitado após erro de registro', async () => {
    mockSignUpFn.mockImplementation(() =>
      Promise.resolve({ error: { message: 'Email já cadastrado' } })
    );
    const { getByTestId } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'existente@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByTestId('register-button'));

    // Aguarda erro aparecer
    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Email já cadastrado');
    });

    // Bug fix: botão deve ser reabilitado após erro
    const button = getByTestId('register-button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent('Criar Conta');
  });

  it('botão NÃO está desabilitado após erro genérico (catch)', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Erro interno'));
    const { getByTestId } = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Erro interno');
    });

    // Bug fix: botão deve ser reabilitado após qualquer erro
    const button = getByTestId('register-button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent('Criar Conta');
  });

  it('botão NÃO está desabilitado após sucesso (finally executa mesmo com redirect)', async () => {
    // Este teste usa onSubmit ao invés de signUpAuth mockado para controlar melhor
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'novo@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByTestId('register-button'));

    // Aguarda chamada de onSubmit
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('novo@email.com', 'senha123');
    });

    // Bug fix: botão deve ser reabilitado após sucesso (finally executa)
    const button = getByTestId('register-button');
    expect(button).not.toBeDisabled();
  });

  it('botão ESTÁ desabilitado durante loading (estado transitório)', async () => {
    mockSignUpFn.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    );
    const { getByTestId } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByTestId('register-button'));

    // Imediatamente após click, o botão deve estar desabilitado
    await waitFor(() => {
      const button = getByTestId('register-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Criando conta');
    });
  });

  it('mensagem de erro é exibida quando registro falha', async () => {
    mockSignUpFn.mockImplementation(() =>
      Promise.resolve({ error: { message: 'Email já cadastrado' } })
    );
    const { getByTestId } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'existente@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Email já cadastrado');
    });
  });

  it('reset de loading permite novo submit após erro', async () => {
    let callCount = 0;
    mockSignUpFn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ error: { message: 'Primeiro erro' } });
      }
      return Promise.resolve({ error: null });
    });

    const { getByTestId } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });

    // Primeiro submit - falha
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Primeiro erro');
    });

    // Bug fix: botão deve estar habilitado para permitir retry
    const button = getByTestId('register-button');
    expect(button).not.toBeDisabled();

    // Segundo submit - sucesso (ou ao menos não dá erro de re-submit)
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSignUpFn).toHaveBeenCalledTimes(2);
    });
  });
});
