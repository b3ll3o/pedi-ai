// ============================================================
// API Client — substitui Supabase para comunicação com NestJS
// ============================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================
// Tipos
// ============================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// ============================================================
// Storage de tokens (client-side)
// ============================================================

const TOKEN_KEY = 'pedi_ai_access_token';
const REFRESH_KEY = 'pedi_ai_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ============================================================
// Fetch com retry de token
// ============================================================

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      // Tentar refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry com novo token
        const newToken = getAccessToken();
        (<Record<string, string>>headers).Authorization = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        const data = await retryResponse.json();
        return retryResponse.ok ? { data } : { error: data.message || 'Erro' };
      }
      // Refresh falhou, limpar tokens
      clearTokens();
      return { error: 'Sessão expirada' };
    }

    const data = await response.json();
    return response.ok ? { data } : { error: data.message || 'Erro' };
  } catch (_error) {
    return { error: 'Erro de conexão' };
  }
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Auth API
// ============================================================

export const authApi = {
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<ApiResponse<AuthTokens & { user: User }>> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    if (response.ok) {
      setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
      return { data };
    }
    return { error: data.message || 'Erro ao registrar' };
  },

  async login(email: string, password: string): Promise<ApiResponse<AuthTokens & { user: User }>> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
      return { data };
    }
    return { error: data.message || 'Credenciais inválidas' };
  },

  async logout(): Promise<void> {
    await fetchWithAuth('/auth/logout', { method: 'POST' });
    clearTokens();
  },

  async me(): Promise<ApiResponse<User>> {
    return fetchWithAuth<User>('/auth/me');
  },

  async isAuthenticated(): Promise<boolean> {
    const token = getAccessToken();
    if (!token) return false;
    const { error } = await this.me();
    return !error;
  },
};

// ============================================================
// Restaurants API
// ============================================================

export const restaurantsApi = {
  async getAll(): Promise<ApiResponse<any[]>> {
    return fetchWithAuth<any[]>('/restaurants');
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/restaurants/${id}`);
  },

  async getBySlug(slug: string): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/restaurants/slug/${slug}`);
  },

  async create(data: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>('/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: Partial<{ name: string; active: boolean }>
  ): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/restaurants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================
// Orders API
// ============================================================

export const ordersApi = {
  async getAll(restaurantId: string): Promise<ApiResponse<any[]>> {
    return fetchWithAuth<any[]>(`/orders?restaurantId=${restaurantId}`);
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/orders/${id}`);
  },

  async create(data: {
    restaurantId: string;
    tableId?: string;
    customerId?: string;
    customerName?: string;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod?: string;
    items: any[];
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },
};

// ============================================================
// Payments API
// ============================================================

export const paymentsApi = {
  async createPixPayment(data: {
    orderId: string;
    restaurantId: string;
    amount: number;
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>('/payments/pix/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPixStatus(paymentId: string): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/payments/pix/status/${paymentId}`);
  },
};

// ============================================================
// Categories API
// ============================================================

export const categoriesApi = {
  async getByRestaurant(restaurantId: string): Promise<ApiResponse<any[]>> {
    return fetchWithAuth<any[]>(`/categories?restaurantId=${restaurantId}`);
  },

  async create(data: {
    restaurantId: string;
    name: string;
    description?: string;
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: Partial<{ name: string; description: string }>
  ): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return fetchWithAuth<void>(`/categories/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Products API
// ============================================================

export const productsApi = {
  async getByRestaurant(restaurantId: string): Promise<ApiResponse<any[]>> {
    return fetchWithAuth<any[]>(`/products?restaurantId=${restaurantId}`);
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/products/${id}`);
  },

  async create(data: {
    categoryId: string;
    name: string;
    description?: string;
    price: number;
  }): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      available: boolean;
    }>
  ): Promise<ApiResponse<any>> {
    return fetchWithAuth<any>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return fetchWithAuth<void>(`/products/${id}`, { method: 'DELETE' });
  },
};
