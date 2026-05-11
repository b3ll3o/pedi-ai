'use client';

import { useState, FormEvent } from 'react';
import styles from './LoginForm.module.css';
import { resetPassword, signUp } from '@/lib/supabase/auth';

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void> | void;
  registeredSuccess?: boolean;
  resetSuccess?: boolean;
}

export function LoginForm({ onSubmit, registeredSuccess, resetSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setResendError('Por favor, insira seu email para reenviar a confirmação');
      return;
    }
    if (!validateEmail(email)) {
      setResendError('Por favor, insira um email válido');
      return;
    }
    setResendSuccess(false);
    setResendError('');
    setIsResending(true);
    try {
      const { error: signUpError } = await signUp(email, password || 'temporary-password');
      // Supabase reenvia email de confirmação se o usuário ainda não confirmou
      if (signUpError) {
        if (signUpError.message !== 'Email not confirmed') {
          setResendError(signUpError.message || 'Erro ao reenviar email de confirmação');
        }
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Erro ao reenviar confirmação:', err);
      setResendError('Erro ao reenviar email de confirmação');
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!forgotPasswordEmail || !validateEmail(forgotPasswordEmail)) {
      return;
    }
    try {
      await resetPassword(forgotPasswordEmail);
      setForgotPasswordSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email de recuperação');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email é obrigatório');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Por favor, insira um email válido');
      return;
    }

    if (!password) {
      setPasswordError('Senha é obrigatória');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {registeredSuccess && (
        <div className={styles.success} role="alert" data-testid="registration-success">
          <div className={styles.successContent}>
            <svg
              className={styles.successIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div className={styles.successText}>
              <strong>Conta criada com sucesso!</strong>
              <p>Acesse seu email para confirmar seu cadastro antes de fazer login.</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.resendButton}
            onClick={handleResendConfirmation}
            disabled={isResending}
          >
            {isResending ? 'Enviando...' : 'Reenviar email de confirmação'}
          </button>
          {resendSuccess && (
            <div className={styles.resendSuccessMessage} role="alert" aria-live="polite">
              Email de confirmação reenviado! Verifique sua caixa de entrada.
            </div>
          )}
          {resendError && (
            <div className={styles.resendErrorMessage} role="alert" aria-live="assertive">
              {resendError}
            </div>
          )}
        </div>
      )}
      {resetSuccess && (
        <div className={styles.success} role="alert" data-testid="reset-success">
          <div className={styles.successContent}>
            <svg
              className={styles.successIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div className={styles.successText}>
              <strong>Senha redefinida com sucesso!</strong>
              <p>Faça login com sua nova senha.</p>
            </div>
          </div>
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setResendError(''); }}
          className={styles.input}
          placeholder="seu@email.com"
          disabled={isLoading}
          autoComplete="email"
          data-testid="email-input"
        />
        {emailError && (
          <span className={styles.fieldError} data-testid="field-error">
            {emailError}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="current-password"
          data-testid="password-input"
        />
        {passwordError && (
          <span className={styles.fieldError} data-testid="field-error">
            {passwordError}
          </span>
        )}
      </div>

      <div className={styles.forgotPassword}>
        <button
          type="button"
          className={styles.forgotPasswordLink}
          onClick={() => setShowForgotPassword(!showForgotPassword)}
          data-testid="forgot-password-link"
        >
          Esqueceu a senha?
        </button>
      </div>

      {error && (
        <div className={styles.error} role="alert" data-testid="error-message">
          <svg
            className={styles.errorIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {showForgotPassword && !forgotPasswordSuccess && (
        <div className={styles.forgotPasswordForm}>
          <div>
            <label htmlFor="forgot-password-email" className={styles.label}>
              Email para recuperação
            </label>
            <input
              id="forgot-password-email"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              className={styles.input}
              placeholder="seu@email.com"
              data-testid="forgot-password-email"
            />
            <button
              type="button"
              className={styles.button}
              onClick={handleForgotPassword}
              data-testid="forgot-password-submit"
            >
              Enviar link de recuperação
            </button>
          </div>
        </div>
      )}

      {forgotPasswordSuccess && (
        <div className={styles.success} data-testid="forgot-password-success">
          Link de recuperação enviado! Verifique seu email.
        </div>
      )}

      <button
        type="submit"
        className={styles.button}
        disabled={isLoading}
        data-testid="login-button"
      >
        {isLoading ? (
          <>
            <svg
              className={styles.spinner}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </button>
    </form>
  );
}