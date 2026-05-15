import { vi } from 'vitest'
import type { AuthResponse, Session, User } from '@supabase/supabase-js'

/**
 * Configuração padrão para mocks de Supabase Auth
 */
export interface MockSupabaseAuthConfig {
  signUp?: {
    respostaParcial?: Partial<AuthResponse>
  }
  signIn?: {
    respostaParcial?: Partial<AuthResponse>
  }
  signOut?: {
    error?: Error | null
  }
  getSession?: {
    session?: Session | null
  }
  getUser?: {
    user?: User | null
  }
  resetPassword?: {
    error?: Error | null
  }
  onAuthStateChange?: {
    unsubscribe?: () => void
  }
}

/**
 * Dados mockados de usuário para testes
 */
export const MockUser: User = {
  id: 'user-mock-123',
  email: 'usuario@mock.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: { name: 'Usuário Mock' },
}

/**
 * Sessão mockada para testes
 */
export function createMockSession(user: User = MockUser): Session {
  return {
    access_token: `mock-token-${Date.now()}`,
    refresh_token: `mock-refresh-${Date.now()}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  }
}

/**
 * Resposta de autenticação mockada
 */
export function createMockAuthResponse(
  user: User | null = MockUser,
  session: Session | null = null
): AuthResponse {
  return {
    data: {
      user,
      session,
    },
    error: null,
  } as AuthResponse
}

/**
 * Cria um mock de Supabase Auth com valores configuráveis para testes unitários.
 *
 * @param config - Configuração opcional para sobrescrever valores de retorno
 * @returns Mock do módulo de autenticação
 *
 * @example
 * // Mock básico com valores padrão
 * const mockAuth = createMockSupabaseAuth()
 *
 * @example
 * // Mock com valores customizados
 * const mockAuth = createMockSupabaseAuth({
 *   signIn: {
 *     respostaParcial: {
 *       data: { user: { id: 'custom-id' } }
 *     }
 *   }
 * })
 */
export function createMockSupabaseAuth(config?: MockSupabaseAuthConfig): {
  signUp: ReturnType<typeof vi.fn>
  signIn: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
  getSession: ReturnType<typeof vi.fn>
  getUser: ReturnType<typeof vi.fn>
  resetPassword: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  _mockUnsubscribe: () => void
} {
  const defaultSession = createMockSession()
  const defaultAuthResponse = createMockAuthResponse()

  // Callback storage for onAuthStateChange
  const _storedCallback: ((event: string, session: Session | null) => void) | null = null

  const mock = {
    signUp: vi.fn(async (_email: string, _password: string): Promise<AuthResponse> => {
      const partial = config?.signUp?.respostaParcial
      if (partial) {
        return {
          ...defaultAuthResponse,
          ...partial,
          data: { ...defaultAuthResponse.data, ...partial.data },
        } as AuthResponse
      }
      return {
        data: {
          user: { ...MockUser, id: `user-${Date.now()}`, email },
          session: null,
        },
        error: null,
      } as AuthResponse
    }),

    signIn: vi.fn(async (_email: string, _password: string): Promise<AuthResponse> => {
      const partial = config?.signIn?.respostaParcial
      if (partial) {
        return {
          ...defaultAuthResponse,
          ...partial,
          data: { ...defaultAuthResponse.data, ...partial.data },
        } as AuthResponse
      }
      return {
        data: {
          user: { ...MockUser, email },
          session: defaultSession,
        },
        error: null,
      } as AuthResponse
    }),

    signOut: vi.fn(async (): Promise<void> => {
      const error = config?.signOut?.error
      if (error) throw error
    }),

    getSession: vi.fn(async (): Promise<Session | null> => {
      return config?.getSession?.session ?? defaultSession
    }),

    getUser: vi.fn(async (): Promise<User | null> => {
      return config?.getUser?.user ?? MockUser
    }),

    resetPassword: vi.fn(async (_email: string): Promise<void> => {
      const error = config?.resetPassword?.error
      if (error) throw error
    }),

    onAuthStateChange: vi.fn(
      (callback: (event: string, session: Session | null) => void) => {
        storedCallback = callback
        const unsubscribe = config?.onAuthStateChange?.unsubscribe ?? (() => {})
        return {
          data: { subscription: { unsubscribe } },
        }
      }
    ),

    _mockUnsubscribe: () => {},
  }

  return mock
}

/**
 * Mock pré-configurado para cenários de teste comuns
 */
export const SupabaseAuthMock = {
  /**
   * Sessão de usuário autenticado
   */
  sessionAutenticado: (_email: string = 'usuario@mock.com'): { session: Session; user: User } => {
    const user = { ...MockUser, email }
    return {
      session: createMockSession(user),
      user,
    }
  },

  /**
   * Sessão nula (usuário não autenticado)
   */
  semSessao: (): { session: null; user: null } => ({
    session: null,
    user: null,
  }),

  /**
   * Erro de autenticação genérico
   */
  erroAutenticacao: (): { data: { user: null; session: null }; error: Error } => ({
    data: { user: null, session: null },
    error: new Error('Credenciais inválidas'),
  }),
}
