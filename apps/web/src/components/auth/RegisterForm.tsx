'use client';

import { useState, FormEvent } from 'react';

import styles from './RegisterForm.module.css';

type Intent = 'gerenciar_restaurante' | 'fazer_pedidos';

interface RegisterFormProps {
  onSubmit?: (
    name: string,
    email: string,
    password: string,
    intent: Intent
  ) => Promise<void> | void;
}

/**
 * Política de senha alinhada com NIST SP 800-63B §5.1.1.2 (memorized secrets).
 *
 * - **Mínimo 8 caracteres** — anti-brute-force sem regras de composição.
 * - **Máximo 128 caracteres** — limite prático para inputs do usuário.
 * - **Sem regras de composição** — NIST §5.1.1.2: "Verifiers SHOULD NOT impose
 *   other composition rules (e.g., requiring mixtures of different character
 *   types) for memorized secrets", pois causam password fatigue → "Senha@123".
 *
 * Auditoria P0-10: removida `validarComplexidadeSenha` que exigia 1 maiúscula
 * + 1 número + 1 caractere especial. Era contrária ao NIST 800-63B §5.1.1.2 e
 * divergia da política real aplicada pela API.
 *
 * @see https://pages.nist.gov/800-63-3/sp800-63b.html#memsecret
 */
const SENHA_MIN_CARACTERES = 8;
const SENHA_MAX_CARACTERES = 128;

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
  const [intent, setIntent] = useState<Intent | null>(null);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  /**
   * Valida o formulário e seta erros específicos em cada campo.
   * Retorna `null` se tudo OK, ou mensagem de erro geral caso contrário.
   */
  const validateForm = (): string | null => {
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!name.trim()) {
      setNameError('Nome é obrigatório');
      return 'Nome inválido';
    }

    if (!email) {
      setEmailError('Email é obrigatório');
      return 'Email obrigatório';
    }
    if (!validateEmail(email)) {
      setEmailError('Por favor, insira um email válido');
      return 'Email inválido';
    }

    if (!password) {
      setPasswordError('Senha é obrigatória');
      return 'Senha obrigatória';
    }
    // Política NIST 800-63B §5.1.1.2: apenas comprimento, sem composição.
    if (password.trim().length === 0) {
      setPasswordError('Senha não pode ser apenas espaços');
      return 'Senha inválida';
    }
    if (password.length < SENHA_MIN_CARACTERES) {
      setPasswordError(`Senha deve ter no mínimo ${SENHA_MIN_CARACTERES} caracteres`);
      return 'Senha curta';
    }
    if (password.length > SENHA_MAX_CARACTERES) {
      setPasswordError(`Senha deve ter no máximo ${SENHA_MAX_CARACTERES} caracteres`);
      return 'Senha longa';
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirmação de senha é obrigatória');
      return 'Confirmação obrigatória';
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem');
      return 'Senhas não coincidem';
    }

    if (!intent) {
      return 'Por favor, selecione uma intenção';
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(name.trim(), email, password, intent!);
      } else {
        throw new Error('onSubmit handler not provided');
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
          Nome
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

      <div className={styles.intentSelection}>
        <span className={styles.intentLabel}>Como você deseja usar o Pedi-AI?</span>
        <button
          type="button"
          onClick={() => setIntent('gerenciar_restaurante')}
          className={`${styles.intentButtonOwner} ${intent === 'gerenciar_restaurante' ? styles.selected : ''}`}
          disabled={isLoading}
          aria-pressed={intent === 'gerenciar_restaurante'}
        >
          <span className={styles.intentIcon}>🏪</span>
          <span className={styles.intentContent}>
            <span className={styles.intentTitle}>Quero gerenciar meu restaurante</span>
            <span className={styles.intentDescription}>
              Cadastre seu negócio, produtos e pedidos
            </span>
          </span>
          <span className={styles.intentCheck} aria-hidden="true">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIntent('fazer_pedidos')}
          className={`${styles.intentButtonCustomer} ${intent === 'fazer_pedidos' ? styles.selected : ''}`}
          disabled={isLoading}
          aria-pressed={intent === 'fazer_pedidos'}
        >
          <span className={styles.intentIcon}>🍽️</span>
          <span className={styles.intentContent}>
            <span className={styles.intentTitle}>Quero fazer pedidos</span>
            <span className={styles.intentDescription}>Explore cardápios e peça pelo app</span>
          </span>
          <span className={styles.intentCheck} aria-hidden="true">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
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
