import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { RegisterForm } from '@/components/auth/RegisterForm';

const mockRouterPush = vi.fn(() => Promise.resolve());
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// ── Helpers ─────────────────────────────────────────────────

function preencherFormulario(
  utils: ReturnType<typeof render>,
  overrides: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    intent?: string;
  } = {}
) {
  const { getByTestId, getByText } = utils;
  const {
    name = 'João Silva',
    email = 'teste@email.com',
    password = 'Senha@123',
    confirmPassword = 'Senha@123',
    intent = 'Quero gerenciar meu restaurante',
  } = overrides;

  if (name !== undefined) fireEvent.change(getByTestId('name-input'), { target: { value: name } });
  if (email !== undefined)
    fireEvent.change(getByTestId('email-input'), { target: { value: email } });
  if (password !== undefined)
    fireEvent.change(getByTestId('password-input'), { target: { value: password } });
  if (confirmPassword !== undefined)
    fireEvent.change(getByTestId('confirm-password-input'), { target: { value: confirmPassword } });
  if (intent) fireEvent.click(getByText(intent));
}

// ── Tests ─────────────────────────────────────────────────

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Renderização inicial', () => {
    it('exibe todos os campos visíveis', () => {
      const { getByTestId } = render(<RegisterForm />);

      expect(getByTestId('name-input')).toBeVisible();
      expect(getByTestId('email-input')).toBeVisible();
      expect(getByTestId('password-input')).toBeVisible();
      expect(getByTestId('confirm-password-input')).toBeVisible();
      expect(getByTestId('register-button')).toBeVisible();
    });

    it('exibe botão com texto "Criar Conta"', () => {
      const { getByTestId } = render(<RegisterForm />);
      expect(getByTestId('register-button')).toHaveTextContent('Criar Conta');
    });

    it('não exibe mensagens de erro inicialmente', () => {
      const { queryAllByTestId, queryByTestId } = render(<RegisterForm />);
      expect(queryAllByTestId('field-error')).toHaveLength(0);
      expect(queryByTestId('error-message')).toBeNull();
    });

    it('campos estão habilitados inicialmente', () => {
      const { getByTestId } = render(<RegisterForm />);

      expect(getByTestId('name-input')).not.toBeDisabled();
      expect(getByTestId('email-input')).not.toBeDisabled();
      expect(getByTestId('password-input')).not.toBeDisabled();
      expect(getByTestId('confirm-password-input')).not.toBeDisabled();
      expect(getByTestId('register-button')).not.toBeDisabled();
    });
  });

  describe('2. Validações de nome', () => {
    it('exibe erro "Nome é obrigatório" quando nome está vazio', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: '' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(queryByText('Nome é obrigatório')).toBeInTheDocument();
      });
    });

    it('não exibe erro de nome quando nome está preenchido', async () => {
      const utils = render(<RegisterForm />);
      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.queryByText('Nome é obrigatório')).not.toBeInTheDocument();
      });
    });
  });

  describe('3. Validações de email', () => {
    it('exibe erro "Email é obrigatório" quando email está vazio', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: '' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(queryByText('Email é obrigatório')).toBeInTheDocument();
      });
    });

    it('exibe erro "Por favor, insira um email válido" quando email é inválido', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: 'email-invalido' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'senha123' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(queryByText('Por favor, insira um email válido')).toBeInTheDocument();
      });
    });

    it('não exibe erro de email quando email é válido', async () => {
      const utils = render(<RegisterForm />);
      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.queryByText('Email é obrigatório')).not.toBeInTheDocument();
        expect(utils.queryByText('Por favor, insira um email válido')).not.toBeInTheDocument();
      });
    });
  });

  describe('4. Validações de senha', () => {
    it('exibe erro "Senha é obrigatória" quando senha está vazia', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: '' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: '' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(queryByText('Senha é obrigatória')).toBeInTheDocument();
      });
    });

    it('exibe erro "Senha deve ter pelo menos 8 caracteres" quando senha tem menos de 8 chars', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'Ab1@' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'Ab1@' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(queryByText('Senha deve ter pelo menos 8 caracteres')).toBeInTheDocument();
      });
    });

    it('exibe erro de complexidade quando senha não tem maiúscula, número e caractere especial', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'abcdefgh' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'abcdefgh' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(
          queryByText('Senha deve conter letra maiúscula, número e caractere especial')
        ).toBeInTheDocument();
      });
    });

    it('não exibe erro de senha quando tem 8+ caracteres com complexidade', async () => {
      const utils = render(<RegisterForm />);
      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.queryByText('Senha é obrigatória')).not.toBeInTheDocument();
        expect(utils.queryByText('Senha deve ter pelo menos 8 caracteres')).not.toBeInTheDocument();
        expect(
          utils.queryByText('Senha deve conter letra maiúscula, número e caractere especial')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('5. Validações de confirmação de senha', () => {
    it('exibe erro "Confirmação de senha é obrigatória" quando confirmação está vazia', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'Senha@123' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: '' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(queryByText('Confirmação de senha é obrigatória')).toBeInTheDocument();
      });
    });

    it('exibe erro "As senhas não coincidem" quando senhas são diferentes', async () => {
      const { getByTestId, queryByText } = render(<RegisterForm />);

      fireEvent.change(getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(getByTestId('password-input'), { target: { value: 'Senha@123' } });
      fireEvent.change(getByTestId('confirm-password-input'), { target: { value: 'Outra@456' } });
      fireEvent.click(getByTestId('register-button'));

      await waitFor(() => {
        expect(queryByText('As senhas não coincidem')).toBeInTheDocument();
      });
    });

    it('não exibe erro de confirmação quando senhas coincidem', async () => {
      const utils = render(<RegisterForm />);
      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.queryByText('Confirmação de senha é obrigatória')).not.toBeInTheDocument();
        expect(utils.queryByText('As senhas não coincidem')).not.toBeInTheDocument();
      });
    });
  });

  describe('6. Submit com sucesso (onSubmit fornecido)', () => {
    it('chama onSubmit com name, email, password e intent corretos', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'João Silva',
          'teste@email.com',
          'Senha@123',
          'gerenciar_restaurante'
        );
      });
    });

    it('chama onSubmit apenas uma vez', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it('não chama onSubmit quando nome está vazio', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      fireEvent.change(utils.getByTestId('name-input'), { target: { value: '' } });
      fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.change(utils.getByTestId('confirm-password-input'), {
        target: { value: 'senha123' },
      });
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('não chama onSubmit quando email é inválido', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'email-invalido' } });
      fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'senha123' } });
      fireEvent.change(utils.getByTestId('confirm-password-input'), {
        target: { value: 'senha123' },
      });
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('não chama onSubmit quando senha é muito curta', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(utils.getByTestId('password-input'), { target: { value: '12345' } });
      fireEvent.change(utils.getByTestId('confirm-password-input'), { target: { value: '12345' } });
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('7. Submit com erro (onSubmit lança erro)', () => {
    it('exibe mensagem de erro retornada por onSubmit', async () => {
      const errorMessage = 'Email já está em uso';
      const onSubmit = vi.fn().mockRejectedValue(new Error(errorMessage));
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.queryByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('exibe mensagem genérica quando erro não tem mensagem', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error());
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.queryByText('Erro ao criar conta')).toBeInTheDocument();
      });
    });

    it('exibe mensagem string quando erro rejeita com string', async () => {
      const onSubmit = vi.fn().mockRejectedValue('Erro desconhecido');
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.queryByText('Erro desconhecido')).toBeInTheDocument();
      });
    });
  });

  describe('8. Estados de loading', () => {
    it('desabilita campos durante loading', async () => {
      const onSubmit = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 100));
      });
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.getByTestId('name-input')).toBeDisabled();
        expect(utils.getByTestId('email-input')).toBeDisabled();
        expect(utils.getByTestId('password-input')).toBeDisabled();
        expect(utils.getByTestId('confirm-password-input')).toBeDisabled();
        expect(utils.getByTestId('register-button')).toBeDisabled();
      });
    });

    it('botão mostra "Criando conta..." durante loading', async () => {
      const onSubmit = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 100));
      });
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      preencherFormulario(utils);
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(utils.getByTestId('register-button')).toHaveTextContent('Criando conta...');
      });
    });

    it('finally executa mesmo quando onSubmit rejeita (isLoading volta a false)', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Erro de rede'));
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João Silva' } });
      fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'Senha@123' } });
      fireEvent.change(utils.getByTestId('confirm-password-input'), {
        target: { value: 'Senha@123' },
      });
      fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));
      fireEvent.click(utils.getByTestId('register-button'));

      // Aguarda que o erro seja exibido (confirma que finally executou)
      await waitFor(
        () => {
          expect(utils.getByTestId('error-message')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Após rejeição + finally, botão deve estar habilitado
      await waitFor(() => {
        expect(utils.getByTestId('register-button')).not.toBeDisabled();
      });
    });
  });

  describe('9. Nome com caracteres especiais', () => {
    it('aceita nome com caracteres especiais e passa para onSubmit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const utils = render(<RegisterForm onSubmit={onSubmit} />);

      fireEvent.change(utils.getByTestId('name-input'), { target: { value: 'João José Silva' } });
      fireEvent.change(utils.getByTestId('email-input'), { target: { value: 'teste@email.com' } });
      fireEvent.change(utils.getByTestId('password-input'), { target: { value: 'Senha@123' } });
      fireEvent.change(utils.getByTestId('confirm-password-input'), {
        target: { value: 'Senha@123' },
      });
      fireEvent.click(utils.getByText('Quero gerenciar meu restaurante'));
      fireEvent.click(utils.getByTestId('register-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'João José Silva',
          'teste@email.com',
          'Senha@123',
          'gerenciar_restaurante'
        );
      });
    });
  });
});
