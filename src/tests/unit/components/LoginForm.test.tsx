import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

// Mocks
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();
const mockOnSubmit = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null });
    mockResetPassword.mockResolvedValue({ error: null });
    mockOnSubmit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  // ========== Cenário 1: Renderização correta ==========
  describe('Renderização correta de todos os campos', () => {
    it('deve renderizar o campo de email', () => {
      render(<LoginForm />);
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('deve renderizar o campo de senha', () => {
      render(<LoginForm />);
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    });

    it('deve renderizar o botão de submit', () => {
      render(<LoginForm />);
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    });

    it('deve renderizar o link "Esqueceu a senha?"', () => {
      render(<LoginForm />);
      expect(screen.getByTestId('forgot-password-link')).toBeInTheDocument();
      expect(screen.getByText('Esqueceu a senha?')).toBeInTheDocument();
    });
  });

  // ========== Cenário 2: Validação de email vazio ==========
  describe('Validação de email vazio', () => {
    it('deve exibir erro "Email é obrigatório" quando email estiver vazio', async () => {
      render(<LoginForm />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: '' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByText('Email é obrigatório')).toBeInTheDocument();
      });
    });

    it('não deve chamar onSubmit quando email estiver vazio', async () => {
      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: '' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  // ========== Cenário 3: Validação de email inválido ==========
  describe('Validação de email inválido', () => {
    it('deve exibir erro "Por favor, insira um email válido" para email mal formatado', async () => {
      render(<LoginForm />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'email-invalido' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByText('Por favor, insira um email válido')).toBeInTheDocument();
      });
    });

    it('não deve chamar onSubmit para email mal formatado', async () => {
      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'email-invalido' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  // ========== Cenário 4: Validação de senha vazia ==========
  describe('Validação de senha vazia', () => {
    it('deve exibir erro "Senha é obrigatória" quando senha estiver vazia', async () => {
      render(<LoginForm />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: '' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument();
      });
    });

    it('não deve chamar onSubmit quando senha estiver vazia', async () => {
      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: '' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  // ========== Cenário 5: Validação de senha < 6 caracteres ==========
  describe('Validação de senha com menos de 6 caracteres', () => {
    it('deve exibir erro "Senha deve ter pelo menos 6 caracteres"', async () => {
      render(<LoginForm />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: '12345' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByText('Senha deve ter pelo menos 6 caracteres')).toBeInTheDocument();
      });
    });

    it('não deve chamar onSubmit quando senha tiver menos de 6 caracteres', async () => {
      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: '12345' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  // ========== Cenário 6: Submit com credenciais válidas ==========
  describe('Submit com credenciais válidas', () => {
    it('deve chamar onSubmit com email e senha quando credenciais forem válidas', async () => {
      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('deve chamar onSubmit uma única vez', async () => {
      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ========== Cenário 7: Submit com erro no onSubmit ==========
  describe('Submit com credenciais inválidas (onSubmit lança erro)', () => {
    it('deve exibir mensagem de erro quando onSubmit lançar erro', async () => {
      const errorMessage = 'Credenciais inválidas';
      mockOnSubmit.mockRejectedValue(new Error(errorMessage));

      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'wrongpassword' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });
    });

    it('deve limpar o estado de loading após erro', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Erro'));

      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('login-button')).not.toBeDisabled();
      });
    });
  });

  // ========== Cenário 8: Estado de loading ==========
  describe('Estado de loading durante submit', () => {
    it('deve desabilitar o botão durante o loading', async () => {
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      expect(screen.getByTestId('login-button')).toBeDisabled();
    });

    it('deve exibir texto "Entrando..." durante o loading', async () => {
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      expect(screen.getByText('Entrando...')).toBeInTheDocument();
    });

    it('deve desabilitar os campos de input durante o loading', async () => {
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      expect(screen.getByTestId('email-input')).toBeDisabled();
      expect(screen.getByTestId('password-input')).toBeDisabled();
    });

    it('deve reabilitar o botão após completar o loading', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(<LoginForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('login-button')).not.toBeDisabled();
      });
    });
  });

  // ========== Cenário 9: Checkbox "Lembrar-me" ==========
  describe('Checkbox "Lembrar-me"', () => {
    it('deve renderizar o checkbox de lembrar-me se existir', () => {
      render(<LoginForm />);
      // O componente atual não tem "Lembrar-me", verificamos que não existe
      expect(screen.queryByLabelText(/lembrar-me/i)).not.toBeInTheDocument();
    });
  });

  // ========== Cenário 10: Link "Esqueceu a senha?" ==========
  describe('Link "Esqueceu a senha?"', () => {
    it('deve ser visível e clicável', () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByTestId('forgot-password-link');
      expect(forgotPasswordLink).toBeVisible();
      expect(forgotPasswordLink).toHaveTextContent('Esqueceu a senha?');
    });

    it('deve mostrar o formulário de recuperação ao clicar', async () => {
      render(<LoginForm />);

      fireEvent.click(screen.getByTestId('forgot-password-link'));

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-email')).toBeInTheDocument();
        expect(screen.getByTestId('forgot-password-submit')).toBeInTheDocument();
      });
    });

    it('deve esconder o formulário ao clicar novamente', async () => {
      render(<LoginForm />);

      fireEvent.click(screen.getByTestId('forgot-password-link'));
      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-email')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('forgot-password-link'));
      await waitFor(() => {
        expect(screen.queryByTestId('forgot-password-email')).not.toBeInTheDocument();
      });
    });
  });

  // ========== Cenário 11: Sucesso no registro ==========
  describe('Sucesso no registro (registeredSuccess=true)', () => {
    it('deve exibir mensagem de sucesso quando registeredSuccess for true', () => {
      render(<LoginForm registeredSuccess={true} />);

      expect(screen.getByTestId('registration-success')).toBeInTheDocument();
      expect(screen.getByText('Conta criada com sucesso!')).toBeInTheDocument();
      expect(
        screen.getByText('Acesse seu email para confirmar seu cadastro antes de fazer login.')
      ).toBeInTheDocument();
    });

    it('não deve exibir mensagem de sucesso quando registeredSuccess for false', () => {
      render(<LoginForm registeredSuccess={false} />);

      expect(screen.queryByTestId('registration-success')).not.toBeInTheDocument();
    });

    it('não deve exibir mensagem de sucesso quando registeredSuccess não for fornecido', () => {
      render(<LoginForm />);

      expect(screen.queryByTestId('registration-success')).not.toBeInTheDocument();
    });

    it('deve exibir botão de reenviar email de confirmação', () => {
      render(<LoginForm registeredSuccess={true} />);

      expect(screen.getByText('Reenviar email de confirmação')).toBeInTheDocument();
    });

    it('deve ter o formulário de login visível mesmo com sucesso no registro', () => {
      render(<LoginForm registeredSuccess={true} />);

      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });
  });

  // ========== Cenário 12: Reenvio de email de confirmação ==========
  describe('Reenvio de email de confirmação', () => {
    it('deve chamar signUp ao clicar em reenviar confirmação', async () => {
      render(<LoginForm registeredSuccess={true} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });

      fireEvent.click(screen.getByText('Reenviar email de confirmação'));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('deve mudar texto do botão para "Enviando..." durante o reenvio', async () => {
      render(<LoginForm registeredSuccess={true} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });

      fireEvent.click(screen.getByText('Reenviar email de confirmação'));

      await waitFor(() => {
        expect(screen.getByText('Enviando...')).toBeInTheDocument();
      });
    });

    it('deve desabilitar botão durante o reenvio', async () => {
      render(<LoginForm registeredSuccess={true} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });

      const resendButton = screen.getByText('Reenviar email de confirmação');
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(resendButton).toBeDisabled();
      });
    });

    it('deve reabilitar botão após reenvio', async () => {
      render(<LoginForm registeredSuccess={true} />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });

      fireEvent.click(screen.getByText('Reenviar email de confirmação'));

      await waitFor(() => {
        expect(screen.getByText('Reenviar email de confirmação')).not.toBeDisabled();
      });
    });

    it('não deve chamar signUp se email estiver vazio', async () => {
      render(<LoginForm registeredSuccess={true} />);

      // Email vazio
      fireEvent.click(screen.getByText('Reenviar email de confirmação'));

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  // ========== Testes adicionais ==========
  describe('Validação combinada', () => {
    it('deve validar email primeiro, depois senha', async () => {
      render(<LoginForm />);

      fireEvent.change(screen.getByTestId('email-input'), { target: { value: '' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: '' } });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByText('Email é obrigatório')).toBeInTheDocument();
        expect(screen.queryByText('Senha é obrigatória')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navegação no formulário', () => {
    it('deve permitir digitar no campo de email', () => {
      render(<LoginForm />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'usuario@exemplo.com' } });

      expect(emailInput).toHaveValue('usuario@exemplo.com');
    });

    it('deve permitir digitar no campo de senha', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'minhasenha123' } });

      expect(passwordInput).toHaveValue('minhasenha123');
    });
  });

  describe('Esqueceu a senha - fluxo completo', () => {
    it('deve chamar resetPassword com email correto', async () => {
      render(<LoginForm />);

      fireEvent.click(screen.getByTestId('forgot-password-link'));

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-email')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('forgot-password-email'), {
        target: { value: 'recuperacao@teste.com' },
      });
      fireEvent.click(screen.getByTestId('forgot-password-submit'));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('recuperacao@teste.com');
      });
    });

    it('deve exibir mensagem de sucesso após enviar link de recuperação', async () => {
      render(<LoginForm />);

      fireEvent.click(screen.getByTestId('forgot-password-link'));

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-email')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('forgot-password-email'), {
        target: { value: 'recuperacao@teste.com' },
      });
      fireEvent.click(screen.getByTestId('forgot-password-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-success')).toBeInTheDocument();
        expect(screen.getByText('Link de recuperação enviado! Verifique seu email.')).toBeInTheDocument();
      });
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter label correto para o campo de email', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('deve ter label correto para o campo de senha', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    });

    it('deve ter type correto no campo de email', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
    });

    it('deve ter type correto no campo de senha', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
    });

    it('deve ter autoComplete configurado para email', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('email-input')).toHaveAttribute('autoComplete', 'email');
    });

    it('deve ter autoComplete configurado para senha', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('password-input')).toHaveAttribute('autoComplete', 'current-password');
    });
  });
});
