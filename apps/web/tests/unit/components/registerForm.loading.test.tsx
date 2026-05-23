import { render, waitFor } from '@testing-library/react';
import { fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { RegisterForm } from '@/components/auth/RegisterForm';

// Mock next/navigation
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
    const onSubmit = vi.fn().mockRejectedValue(new Error('Email já cadastrado'));
    const utils = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
    fireEvent.change(utils.getByTestId('email-input'), {
      target: { value: 'existente@email.com' },
    });
    fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(utils.getByTestId('confirm-password-input'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(utils.getByTestId('register-button'));

    // Aguarda erro aparecer
    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Email já cadastrado');
    });

    // Bug fix: botão deve ser reabilitado após erro
    const button = utils.getByTestId('register-button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent('Criar Conta');
  });

  it('botão NÃO está desabilitado após erro genérico (catch)', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Erro interno'));
    const utils = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
    fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(utils.getByTestId('confirm-password-input'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(utils.getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Erro interno');
    });

    // Bug fix: botão deve ser reabilitado após qualquer erro
    const button = utils.getByTestId('register-button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent('Criar Conta');
  });

  it('botão NÃO está desabilitado após sucesso (finally executa mesmo com redirect)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const utils = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
    fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'novo@email.com' } });
    fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(utils.getByTestId('confirm-password-input'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(utils.getByTestId('register-button'));

    // Aguarda chamada de onSubmit
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        'João Silva',
        'novo@email.com',
        'senha123',
        'gerenciar_restaurante'
      );
    });

    // Bug fix: botão deve ser reabilitado após sucesso (finally executa)
    const button = utils.getByTestId('register-button');
    expect(button).not.toBeDisabled();
  });

  it('botão ESTÁ desabilitado durante loading (estado transitório)', async () => {
    const onSubmit = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
    );
    const utils = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
    fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(utils.getByTestId('confirm-password-input'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(utils.getByTestId('register-button'));

    // Imediatamente após click, o botão deve estar desabilitado
    await waitFor(() => {
      const button = utils.getByTestId('register-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Criando conta');
    });
  });

  it('mensagem de erro é exibida quando registro falha', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Email já cadastrado'));
    const utils = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
    fireEvent.change(utils.getByTestId('email-input'), {
      target: { value: 'existente@email.com' },
    });
    fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(utils.getByTestId('confirm-password-input'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(utils.getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Email já cadastrado');
    });
  });

  it('reset de loading permite novo submit após erro', async () => {
    let callCount = 0;
    const onSubmit = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Primeiro erro'));
      }
      return Promise.resolve(undefined);
    });

    const utils = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
    fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(utils.getByTestId('confirm-password-input'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));

    // Primeiro submit - falha
    fireEvent.click(utils.getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Primeiro erro');
    });

    // Bug fix: botão deve estar habilitado para permitir retry
    const button = utils.getByTestId('register-button');
    expect(button).not.toBeDisabled();

    // Segundo submit - sucesso (ou ao menos não dá erro de re-submit)
    fireEvent.click(utils.getByTestId('register-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
  });
});
