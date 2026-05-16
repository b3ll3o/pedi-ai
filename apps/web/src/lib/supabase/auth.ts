import type { AuthResponse, Session, User } from '@supabase/supabase-js';
import { createClient } from './client';

/**
 * Sign up with email and password
 * Includes a timeout to prevent infinite hanging.
 */
async function signUp(email: string, password: string): Promise<AuthResponse> {
  const TIMEOUT_MS = 30_000;

  const timeoutPromise = new Promise<AuthResponse>((_, reject) =>
    setTimeout(() => reject(new Error('Tempo limite de registro excedido')), TIMEOUT_MS)
  );

  const supabase = createClient();
  // Nota: emailConfirm não existe nos tipos TypeScript do Supabase v2,
  // mas a API aceita o parâmetro. O servidor confirma o email se
  // "Confirm email" estiver desabilitado nas configurações do projeto.
  // Para ambiente de desenvolvimento/producao sem SMTP configurado,
  // desabilitamos a confirmacao de email. Em producao com SMTP,
  // alterar para true e configurar SMTP no Supabase Dashboard.
  const signUpPromise = supabase.auth.signUp({
    email,
    password,
    options: {
      emailConfirm: false,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return Promise.race([signUpPromise, timeoutPromise]);
}

/**
 * Sign in with email and password
 */
async function signIn(email: string, password: string): Promise<AuthResponse> {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign out the current user
 */
async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Get the current session
 * Includes a timeout to prevent hanging in E2E/test environments.
 * Reduced from 30s to 10s for faster UX on slow networks.
 */
async function getSession(): Promise<Session | null> {
  const TIMEOUT_MS = 10_000;

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), TIMEOUT_MS)
  );

  const supabase = createClient();
  const sessionPromise = supabase.auth.getSession().then(({ data }) => data.session);

  return Promise.race([sessionPromise, timeoutPromise]);
}

/**
 * Get the current user
 * Includes a timeout to prevent hanging in E2E/test environments.
 */
async function getUser(): Promise<User | null> {
  const TIMEOUT_MS = 30_000;

  const timeoutPromise = new Promise<User | null>((resolve) =>
    setTimeout(() => resolve(null), TIMEOUT_MS)
  );

  const supabase = createClient();
  const userPromise = supabase.auth.getUser().then(({ data }) => data.user);

  return Promise.race([userPromise, timeoutPromise]);
}

/**
 * Reset password for an email
 * @param email - User's email address
 * @param redirectTo - URL to redirect after clicking the reset link
 */
async function resetPassword(email: string, redirectTo?: string): Promise<void> {
  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password`,
  });
}

/**
 * Subscribe to auth state changes
 */
function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange(callback);
}

export { signUp, signIn, signOut, getSession, getUser, resetPassword, onAuthStateChange };
export type { AuthResponse, Session, User };

// Test helper - not part of production API
export const _mockUnsubscribe = () => {};
