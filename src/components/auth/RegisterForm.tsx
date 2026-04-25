'use client';

import { useState, FormEvent } from 'react';
import styles from './RegisterForm.module.css';
import { signUp as signUpAuth } from '@/lib/supabase/auth';

interface RegisterFormProps {
  onSubmit?: (email: string, password: string) => Promise<void> | void;
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

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

    if (!confirmPassword) {
      setConfirmPasswordError('Confirmação de senha é obrigatória');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(email, password);
      } else {
        const { error: signUpError } = await signUpAuth(email, password);
        if (signUpError) {
          throw new Error(signUpError.message);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate data-testid="register-form">
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Nome (opcional)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          placeholder="Seu nome"
          disabled={isLoading}
          autoComplete="name"
          data-testid="name-input"
        />
        {nameError && (
          <span className={styles.fieldError} data-testid="field-error">
            {nameError}
          </span>
        )}
      </div>

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
          autoComplete="new-password"
          data-testid="password-input"
        />
        {passwordError && (
          <span className={styles.fieldError} data-testid="field-error">
            {passwordError}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="confirm-password" className={styles.label}>
          Confirmar Senha
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="new-password"
          data-testid="confirm-password-input"
        />
        {confirmPasswordError && (
          <span className={styles.fieldError} data-testid="field-error">
            {confirmPasswordError}
          </span>
        )}
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

      <button
        type="submit"
        className={styles.button}
        disabled={isLoading}
        data-testid="register-button"
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
            Criando conta...
          </>
        ) : (
          'Criar Conta'
        )}
      </button>
    </form>
  );
}