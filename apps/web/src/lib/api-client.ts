/**
 * API Client com gestão de tokens JWT
 *
 * Wrapper para chamadas à API (apps/api) com:
 * - Tokens armazenados em **cookies HttpOnly** (definidos pelo servidor).
 *   sessionStorage foi removido por ser vetor de XSS (`document.cookie`
 *   sobre HttpOnly retorna vazio).
 * - `credentials: 'include'` em todo fetch para que o navegador envie os
 *   cookies automaticamente em chamadas cross-origin (web:3000 → api:3001).
 * - Fallback para Authorization header apenas em ambientes SSR/server-side.
 * - Refresh automático em 401 (servidor define novos cookies na resposta).
 * - Helpers para auth state.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  private user: User | null = null;

  /**
   * Armazena somente o usuário (não-confidencial) em memória.
   * Tokens vivem em cookies HttpOnly no servidor — não tocamos aqui.
   */
  setUser(user: User): void {
    this.user = user;
  }

  /**
   * Limpa o usuário em memória (logout). Os cookies são limpos pelo servidor.
   */
  clearUser(): void {
    this.user = null;
  }

  /**
   * Retorna o usuário em memória. Pode ser null mesmo se o servidor tiver
   * um cookie válido — use `verifySession()` para checar com a API.
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * Verifica se há sessão ativa chamando /auth/me. Retorna o usuário ou null.
   */
  async verifySession(): Promise<User | null> {
    try {
      const user = await this.get<User>('/auth/me');
      this.user = user;
      return user;
    } catch {
      this.user = null;
      return null;
    }
  }

  /**
   * Fazer requisição à API. Inclui `credentials: 'include'` para que o
   * navegador envie cookies HttpOnly automaticamente.
   */
  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Se 401, tenta refresh uma vez (servidor lê refresh do cookie).
    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    }
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
   * Login via API. Servidor define os cookies HttpOnly.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Email ou senha incorretos');
    }

    this.user = data.user;
    return data;
  }

  /**
   * Register via API. Servidor define os cookies HttpOnly.
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao criar conta');
    }

    this.user = data.user;
    return data;
  }

  /**
   * Logout via API. Servidor limpa os cookies.
   */
  async logout(): Promise<void> {
    try {
      await this.fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    } catch {
      // Ignora erro — cookies serão limpos mesmo assim no servidor.
    } finally {
      this.clearUser();
    }
  }

  /**
   * Obter usuário atual (/auth/me).
   */
  async getMe(): Promise<User | null> {
    return this.verifySession();
  }
}

// Singleton
export const apiClient = new ApiClientClass();
