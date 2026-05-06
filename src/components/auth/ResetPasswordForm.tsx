'use client';

import { useState, FormEvent } from 'react';
import styles from './ResetPasswordForm.module.css';

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  isAdmin?: boolean;
}

export function ResetPasswordForm({ token, onSuccess, onError, isAdmin = false }: ResetPasswordFormProps) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [senhaError, setSenhaError] = useState('');
  const [confirmarSenhaError, setConfirmarSenhaError] = useState('');

  const validateForm = (): boolean => {
    let isValid = true;
    setSenhaError('');
    setConfirmarSenhaError('');
    setError('');

    if (!novaSenha) {
      setSenhaError('Senha é obrigatória');
      isValid = false;
    } else if (novaSenha.length < 6) {
      setSenhaError('A senha deve ter pelo menos 6 caracteres');
      isValid = false;
    }

    if (!confirmarSenha) {
      setConfirmarSenhaError('Confirmação de senha é obrigatória');
      isValid = false;
    } else if (novaSenha !== confirmarSenha) {
      setConfirmarSenhaError('As senhas não coincidem');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, novaSenha }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao redefinir senha');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao redefinir senha';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.success} data-testid="reset-success">
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
        <strong>Senha redefinida com sucesso!</strong>
        <p>Você será redirecionado para fazer login.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="novaSenha" className={styles.label}>
          Nova Senha
        </label>
        <input
          id="novaSenha"
          type="password"
          value={novaSenha}
          onChange={(e) => {
            setNovaSenha(e.target.value);
            setSenhaError('');
          }}
          className={styles.input}
          placeholder="Mínimo 6 caracteres"
          disabled={isLoading}
          autoComplete="new-password"
          data-testid="nova-senha-input"
        />
        {senhaError && (
          <span className={styles.fieldError} data-testid="senha-error">
            {senhaError}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="confirmarSenha" className={styles.label}>
          Confirmar Senha
        </label>
        <input
          id="confirmarSenha"
          type="password"
          value={confirmarSenha}
          onChange={(e) => {
            setConfirmarSenha(e.target.value);
            setConfirmarSenhaError('');
          }}
          className={styles.input}
          placeholder="Repita a nova senha"
          disabled={isLoading}
          autoComplete="new-password"
          data-testid="confirmar-senha-input"
        />
        {confirmarSenhaError && (
          <span className={styles.fieldError} data-testid="confirmar-senha-error">
            {confirmarSenhaError}
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
            aria-hidden="true"
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
        data-testid="submit-button"
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
            Redefinindo...
          </>
        ) : (
          'Redefinir Senha'
        )}
      </button>
    </form>
  );
}