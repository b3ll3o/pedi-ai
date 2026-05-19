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
 */
export async function logout(): Promise<void> {
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
 */
export async function getSession(): Promise<{ user?: { id: string; email: string; role: string; restaurantId?: string } } | null> {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch {
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
    return { error: error instanceof Error ? error.message : 'Erro ao solicitar recuperação de senha' };
  }
}
