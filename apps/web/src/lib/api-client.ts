/**
 * API Client com gestão de tokens JWT
 *
 * Wrapper para chamadas à API (apps/api) com:
 * - Armazenamento de access/refresh tokens
 * - Anexo automático de Authorization header
 * - Tratamento de 401 com refresh automático
 * - Helpers para auth state
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

class ApiClientClass {
  private tokens: Tokens | null = null;
  private user: User | null = null;

  /**
   * Salvar tokens do login/register
   */
  setTokens(accessToken: string, refreshToken: string, user?: User): void {
    this.tokens = { accessToken, refreshToken };
    if (user) {
      this.user = user;
    }
    // Salvar em sessionStorage para persistência entre reloads
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('access_token', accessToken);
      sessionStorage.setItem('refresh_token', refreshToken);
      if (user) {
        sessionStorage.setItem('user', JSON.stringify(user));
      }
    }
  }

  /**
   * Limpar tokens (logout)
   */
  clearTokens(): void {
    this.tokens = null;
    this.user = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('user');
    }
  }

  /**
   * Restaurar tokens do sessionStorage ( hydration )
   */
  restoreTokens(): boolean {
    if (typeof window === 'undefined') return false;

    const accessToken = sessionStorage.getItem('access_token');
    const refreshToken = sessionStorage.getItem('refresh_token');
    const userStr = sessionStorage.getItem('user');

    if (accessToken && refreshToken) {
      this.tokens = { accessToken, refreshToken };
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch {
          this.user = null;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Obter access token atual
   */
  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  /**
   * Obter refresh token atual
   */
  getRefreshToken(): string | null {
    return this.tokens?.refreshToken ?? null;
  }

  /**
   * Obter usuário logado
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.accessToken !== null;
  }

  /**
   * Refresh do access token usando refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokens?.refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.tokens.refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.access_token) {
        this.tokens.accessToken = data.access_token;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('access_token', data.access_token);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Fazer requisição autenticada à API
   * Trata 401 tentando refresh uma vez
   */
  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Anexar token se disponível
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Se 401, tentar refresh
    if (response.status === 401 && this.tokens?.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * GET shorthand
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST shorthand
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH shorthand
   */
  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE shorthand
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Login via API
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Email ou senha incorretos');
    }

    this.setTokens(data.access_token, data.refresh_token, data.user);
    return data;
  }

  /**
   * Register via API
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao criar conta');
    }

    this.setTokens(data.access_token, data.refresh_token, data.user);
    return data;
  }

  /**
   * Logout via API
   */
  async logout(): Promise<void> {
    try {
      await this.fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    } catch {
      // Ignora erro, sempre limpa tokens localmente
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Obter usuário atual (/auth/me)
   */
  async getMe(): Promise<User | null> {
    try {
      return await this.get<User>(`${API_URL}/auth/me`);
    } catch {
      return null;
    }
  }
}

// Singleton
export const apiClient = new ApiClientClass();
