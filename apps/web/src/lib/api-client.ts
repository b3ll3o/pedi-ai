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

/**
 * Restaurant — DTO mínimo usado pelos Route Handlers que precisam
 * do restaurante atual (referral, billing, etc). Backend devolve
 * estrutura maior; aqui pegamos só os campos consumidos.
 */
interface Restaurant {
  id: string;
  name?: string;
  referralCode?: string;
}

/**
 * Referral DTO — shape retornado pelo backend (apps/api). Para os
 * Route Handlers que rehidratan entidades via
 * `Referral.reconstruct(props)`, a forma deve casar com `ReferralProps`.
 */
interface ReferralDTO {
  id: string;
  referrerRestaurantId: string;
  code: string;
  totalSignups: number;
  totalConversions: number;
  rewardCreditMonths: number;
  rewardCreditAppliedMonths: number;
  status: 'pending' | 'converted' | 'expired' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

class ApiClientClass {
  private user: User | null = null;

  /**
   * Cookie header a propagar para o NestJS API. Só é preenchido quando o
   * cliente é construído a partir de um `Request` (Route Handlers do
   * Next.js). No browser, `credentials: 'include'` já cuida disso.
   *
   * **Por que isso existe:** os Route Handlers `/api/auth/*` rodam em Node,
   * não no browser. O `fetch` do Node não tem cookie jar — sem propagar o
   * header `Cookie` manualmente, o NestJS enxerga toda chamada como
   * anônima e `/auth/me` devolve 401 mesmo com o usuário logado.
   */
  private cookieHeader: string | null = null;

  /**
   * `Set-Cookie` capturados das respostas do NestJS durante esta request.
   * Route Handlers devem repassá-los ao browser (ver `consumeSetCookies`),
   * caso contrário o cookie HttpOnly emitido pelo login nunca chega ao
   * navegador.
   */
  private collectedSetCookies: string[] = [];

  constructor(cookieHeader?: string | null) {
    this.cookieHeader = cookieHeader ?? null;
  }

  /**
   * Retorna (e limpa) os `Set-Cookie` acumulados nas respostas do backend.
   */
  consumeSetCookies(): string[] {
    const cookies = this.collectedSetCookies;
    this.collectedSetCookies = [];
    return cookies;
  }

  /**
   * Captura os `Set-Cookie` de uma resposta do NestJS.
   *
   * `Headers.getSetCookie()` existe no runtime do Next (undici) mas não em
   * todos os ambientes de teste — daí o fallback para `get('set-cookie')`.
   */
  private captureSetCookies(response: Response): void {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const values =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : ([response.headers.get('set-cookie')].filter(Boolean) as string[]);
    if (values.length > 0) {
      this.collectedSetCookies.push(...values);
    }
  }

  /**
   * Monta os headers padrão, incluindo `Cookie` quando em contexto server.
   */
  private buildHeaders(extra?: HeadersInit): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extra as Record<string, string>),
    };
    if (this.cookieHeader) {
      headers.Cookie = this.cookieHeader;
    }
    return headers;
  }

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

    const headers = this.buildHeaders(options.headers);

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    this.captureSetCookies(response);

    // Se 401, tenta refresh uma vez (servidor lê refresh do cookie).
    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          headers: this.buildHeaders(options.headers),
          credentials: 'include',
        });
        this.captureSetCookies(response);
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
        headers: this.buildHeaders(),
        credentials: 'include',
      });
      this.captureSetCookies(response);
      if (response.ok) {
        // Em contexto server (Route Handler) não há cookie jar: o retry
        // seguinte precisa enviar os cookies recém-emitidos, senão o
        // refresh é inútil e a chamada volta a dar 401.
        this.mergeCookieHeaderFromCollected();
      }
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Reescreve `cookieHeader` aplicando os pares `nome=valor` presentes nos
   * `Set-Cookie` capturados. Só faz sentido em contexto server.
   */
  private mergeCookieHeaderFromCollected(): void {
    // No browser o cookie jar é do navegador e `Cookie` é um header
    // proibido em `fetch` — não faz sentido (nem funciona) montar à mão.
    if (typeof window !== 'undefined') return;
    if (this.collectedSetCookies.length === 0) return;
    const jar = new Map<string, string>();
    for (const pair of (this.cookieHeader ?? '').split(';')) {
      const [name, ...rest] = pair.trim().split('=');
      if (name) jar.set(name, rest.join('='));
    }
    for (const raw of this.collectedSetCookies) {
      const [nameValue] = raw.split(';');
      const [name, ...rest] = nameValue.trim().split('=');
      if (name) jar.set(name, rest.join('='));
    }
    this.cookieHeader = Array.from(jar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
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
      headers: this.buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    this.captureSetCookies(response);
    this.mergeCookieHeaderFromCollected();

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
      headers: this.buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    });
    this.captureSetCookies(response);
    this.mergeCookieHeaderFromCollected();

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao criar conta');
    }

    this.user = data.user;
    return data;
  }

  /**
   * Logout via API. Servidor limpa os cookies.
   *
   * Antes de chamar o endpoint, purga dados pessoais do IndexedDB local
   * (LGPD art. 18 — direito ao esquecimento). A purga é best-effort:
   * se falhar (ex.: IndexedDB indisponível), o logout prossegue.
   *
   * Server-side: a purga é no-op (guard interno). Assim esta função é
   * segura para ser chamada de Route Handlers Next.js também.
   */
  async logout(): Promise<void> {
    // Import dinâmico: o módulo `safePurge` só roda em ambiente browser
    // (guarda contra ausência de indexedDB) e mantém Dexie fora do
    // bundle server quando a rota é chamada por SSR.
    const { purgeLocalDataSafely } = await import('@/lib/offline/safePurge');
    await purgeLocalDataSafely();

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

  /**
   * **Stub temporário** — Restaurante autenticado.
   * Endpoint real deveria ser `/restaurants/me` no NestJS API. Por
   * enquanto chama `/auth/me` que devolve o usuário; o restaurante é
   * derivado do `restaurant_id` no JWT (servidor faz essa decodificação).
   *
   * TODO: substituir por chamada dedicada quando o endpoint
   * `/restaurants/me` for implementado no apps/api.
   */
  async getCurrentRestaurant(): Promise<Restaurant | null> {
    const user = await this.verifySession();
    if (!user) return null;
    // Stub: devolve um Restaurant mínimo com o id do user. Backend
    // precisa resolver `restaurant_id` real a partir do token JWT.
    return { id: user.id, name: user.name };
  }

  /**
   * **Stub temporário** — Busca Referral por restaurantId.
   */
  async getReferralByRestaurant(_restaurantId: string): Promise<ReferralDTO | null> {
    // TODO: chamar `/referrals/by-restaurant/${restaurantId}` no NestJS
    return null;
  }

  /**
   * **Stub temporário** — Busca Referral por código.
   */
  async getReferralByCode(code: string): Promise<ReferralDTO | null> {
    // TODO: chamar `/referrals/by-code/${code}` no NestJS
    // Retorna mock mínimo para satisfazer a forma esperada pelo caller.
    return {
      id: `ref-${code}`,
      referrerRestaurantId: 'unknown',
      code,
      totalSignups: 0,
      totalConversions: 0,
      rewardCreditMonths: 0,
      rewardCreditAppliedMonths: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * **Stub temporário** — Cria Referral no backend.
   */
  async createReferral(referral: { id: string; code: string }): Promise<ReferralDTO> {
    // TODO: chamar POST `/referrals` no NestJS
    return {
      id: referral.id,
      referrerRestaurantId: 'unknown',
      code: referral.code,
      totalSignups: 0,
      totalConversions: 0,
      rewardCreditMonths: 0,
      rewardCreditAppliedMonths: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * **Stub temporário** — Atualiza código customizado.
   */
  async updateReferralCode(_restaurantId: string, code: string): Promise<ReferralDTO> {
    // TODO: chamar PATCH `/referrals/me/code` no NestJS
    return {
      id: `ref-${code}`,
      referrerRestaurantId: 'unknown',
      code,
      totalSignups: 0,
      totalConversions: 0,
      rewardCreditMonths: 0,
      rewardCreditAppliedMonths: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }
}

// Singleton
export const apiClient = new ApiClientClass();

/**
 * Factory para criar (ou reusar) um ApiClient com contexto de request.
 * Alguns Route Handlers precisam propagar headers do request (cookies,
 * Authorization) — o singleton puro não tem essa info. O factory
 * aceita `NextRequest` opcional; quando passado, injeta o header
 * `Cookie` no cliente para que o NestJS API reconheça a sessão.
 *
 * Quando `request` é informado, devolve uma instância dedicada com o
 * header `Cookie` do browser propagado — necessário porque Route Handlers
 * rodam em Node, sem cookie jar. Sem `request`, devolve o singleton.
 */
export function getApiClient(request?: Request): ApiClientClass {
  if (!request) return apiClient;
  const cookieHeader = request.headers.get('cookie');
  return new ApiClientClass(cookieHeader);
}
