/**
 * Client-side authentication helpers
 * These call the API routes for authentication operations
 */

/**
 * Login with email and password via API route
 */
export async function login(email: string, password: string): Promise<{ error?: string }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Erro ao fazer login' };
    }

    return {};
  } catch (error) {
    console.error('Login error:', error);
    return { error: error instanceof Error ? error.message : 'Erro ao fazer login' };
  }
}

/**
 * Logout via API route
 *
 * Purga dados pessoais locais (LGPD art. 18) ANTES de chamar o endpoint de
 * logout. A purga é best-effort e não bloqueia o logout em caso de falha.
 * Isso garante que o caminho de logout do AdminLayout (que usa este helper
 * diretamente, sem passar por `useAuth`) também limpe PII.
 */
export async function logout(): Promise<void> {
  // Import dinâmico para evitar carregar Dexie em bundles server (este
  // módulo é client-only pelo nome, mas o bundler do Next pode tree-shake
  // errado se houver re-export).
  const { purgeLocalDataSafely } = await import('@/lib/offline/safePurge');
  await purgeLocalDataSafely();

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Get current session from API
 * Usa AbortController com timeout de 8s para evitar fetch pendente infinito
 * quando o servidor está lento ou indisponível.
 */
export async function getSession(): Promise<{
  user: { id: string; email: string; role: string; restaurantId?: string };
} | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('/api/auth/session', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    // AbortError = timeout, treat as no session
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    return null;
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  try {
    const response = await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Erro ao solicitar recuperação de senha' };
    }

    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro ao solicitar recuperação de senha',
    };
  }
}
