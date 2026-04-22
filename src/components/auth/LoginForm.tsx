'use client';

import { useState, FormEvent } from 'react';
import styles from './LoginForm.module.css';
import { resetPassword } from '@/lib/supabase/auth';

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void> | void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
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
      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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