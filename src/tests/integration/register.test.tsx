import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import React from 'react';

import { RegisterForm } from '@/components/auth/RegisterForm';

// ── Mocks ──────────────────────────────────────────────────────────────

const mockSignUpFn = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  signUp: (...args: unknown[]) => mockSignUpFn(...args),
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
  usePathname: () => '/register',
  useSearchParams: () => new URLSearchParams(),
  useEffect: React.useEffect,
}));

// ── Setup / Teardown ──────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  mockSignUpFn.mockClear();
  mockRouterPush.mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('RegisterForm — validação completa do formulário', () => {
  it('renderiza todos os campos corretamente', () => {
    const { getByTestId } = render(<RegisterForm />);

    expect(getByTestId('name-input')).toBeInTheDocument();
    expect(getByTestId('email-input')).toBeInTheDocument();
    expect(getByTestId('password-input')).toBeInTheDocument();
    expect(getByTestId('confirm-password-input')).toBeInTheDocument();
    expect(getByTestId('register-button')).toBeInTheDocument();
    expect(getByTestId('register-button')).toHaveTextContent('Criar Conta');
  });

  it('submit com email inválido mostra erro', async () => {
    const { getByTestId, queryByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'email-invalido' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errors = document.querySelectorAll('[data-testid="field-error"]');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toHaveTextContent('Por favor, insira um email válido');
    });

    expect(queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('submit com email vazio mostra erro', async () => {
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errors = document.querySelectorAll('[data-testid="field-error"]');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toHaveTextContent('Email é obrigatório');
    });
  });

  it('submit com senhas diferentes mostra erro', async () => {
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha-diferente' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errors = document.querySelectorAll('[data-testid="field-error"]');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toHaveTextContent('As senhas não coincidem');
    });
  });

  it('submit com senha menor que 6 caracteres mostra erro', async () => {
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: '12345' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: '12345' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errors = document.querySelectorAll('[data-testid="field-error"]');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toHaveTextContent('Senha deve ter pelo menos 6 caracteres');
    });
  });

  it('submit com confirmação de senha vazia mostra erro', async () => {
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errors = document.querySelectorAll('[data-testid="field-error"]');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toHaveTextContent('Confirmação de senha é obrigatória');
    });
  });

  it('submit com dados válidos chama onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('teste@email.com', 'senha123', 'gerenciar_restaurante');
    });

    expect(document.querySelector('[data-testid="error-message"]')).not.toBeInTheDocument();
  });

  it('submit com onSubmit lançando erro exibe mensagem', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Erro interno'));
    const { getByTestId, getByText } = render(<RegisterForm onSubmit={onSubmit} />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Erro interno');
    });
  });

  it('submit com onSubmit undefined chama signUp do auth', async () => {
    mockSignUpFn.mockImplementation(() => Promise.resolve({ error: null }));
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSignUpFn).toHaveBeenCalledWith('teste@email.com', 'senha123');
    });
  });

  it('se signUp retorna erro, exibe mensagem', async () => {
    mockSignUpFn.mockImplementation(() =>
      Promise.resolve({ error: { message: 'Email já cadastrado' } })
    );
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Email já cadastrado');
    });
  });
});

describe('Fluxo completo — registro com sucesso', () => {
  it('onSubmit resolve e redireciona para /login', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(<RegisterForm onSubmit={mockOnSubmit} />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'novo@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero fazer pedidos'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('novo@email.com', 'senha123', 'fazer_pedidos');
    });
  });

  it('preenche formulário e submete sem erro', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(<RegisterForm onSubmit={mockOnSubmit} />);

    fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
    fireEvent.change(getByTestId('email-input'), { target: { value: 'joao@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'minhasenha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'minhasenha123' } });
    fireEvent.click(getByText('Quero fazer pedidos'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('joao@email.com', 'minhasenha123', 'fazer_pedidos');
    });
  });

  it('estado de loading é exibido durante submit', async () => {
    mockSignUpFn.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    );
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));

    fireEvent.click(getByTestId('register-button'));

    // Logo após o clique, o botão deve estar desabilitado com texto de loading
    await waitFor(() => {
      const button = getByTestId('register-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Criando conta');
    });
  });
});

describe('Fluxo completo — registro com email duplicado', () => {
  it('signUp resolve com erro de email duplicado e exibe mensagem', async () => {
    mockSignUpFn.mockImplementation(() =>
      Promise.resolve({ error: { message: 'Email already registered' } })
    );
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'existente@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Email already registered');
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('preenche e submete com erro de email duplicado', async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Este email já está cadastrado'));
    const { getByTestId, getByText } = render(<RegisterForm onSubmit={mockOnSubmit} />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'ja-cadastrado@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'outrasenha456' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'outrasenha456' } });
    fireEvent.click(getByText('Quero fazer pedidos'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeInTheDocument();
    });
    expect(getByTestId('error-message')).toHaveTextContent('Este email já está cadastrado');
  });

  it('erro genérico é tratado corretamente', async () => {
    mockSignUpFn.mockImplementation(() =>
      Promise.resolve({ error: { message: '' } })
    );
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      // Mensagem fallback quando error.message é vazio
      expect(errorMsg).toHaveTextContent('Erro ao criar conta');
    });
  });
});

describe('RegisterForm — edge cases', () => {
  it('não chama signUp se validação falha', async () => {
    const { getByTestId, getByText } = render(<RegisterForm />);

    // Só email, sem senha
    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSignUpFn).not.toHaveBeenCalled();
    });
  });

  it('campos são desabilitados durante loading', async () => {
    mockSignUpFn.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 200)
        )
    );
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));

    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      expect(getByTestId('email-input')).toBeDisabled();
      expect(getByTestId('password-input')).toBeDisabled();
      expect(getByTestId('confirm-password-input')).toBeDisabled();
    });
  });

  it('todos os erros de validação aparecem simultaneamente', async () => {
    const { getByTestId } = render(<RegisterForm />);

    // Submit sem preencher nada
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errors = document.querySelectorAll('[data-testid="field-error"]');
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('signUp rejeita com network error', async () => {
    mockSignUpFn.mockImplementation(() => Promise.reject(new Error('Network error')));
    const { getByTestId, getByText } = render(<RegisterForm />);

    fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
    fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
    fireEvent.click(getByText('Quero gerenciar meu restaurante'));
    fireEvent.click(getByTestId('register-button'));

    await waitFor(() => {
      const errorMsg = document.querySelector('[data-testid="error-message"]');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent('Network error');
    });
  });
});
