/**
 * Fixture de autenticação para testes E2E.
 *
 * Fornece funções para criar e limpar usuários de teste.
 * Usa Supabase Admin API (service role key).
 *
 * @module fixtures/auth.fixture
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Carregar .env.e2e explicitamente
dotenv.config({ path: path.join(process.cwd(), 'tests/e2e', '.env.e2e') })

// ============================================
// Configuração
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Variáveis de ambiente ausentes:\n' +
    `  - NEXT_PUBLIC_SUPABASE_URL: ${!SUPABASE_URL ? 'ausente' : 'ok'}\n` +
    `  - SUPABASE_SERVICE_ROLE_KEY: ${!SUPABASE_SERVICE_ROLE_KEY ? 'ausente' : 'ok'}\n`
  )
}

// ============================================
// Tipos
// ============================================

export interface TestUser {
  id: string
  email: string
  password: string
}

export interface AuthFixture {
  createUser: (email: string, password: string) => Promise<string>
  deleteUser: (email: string) => Promise<boolean>
  deleteUserById: (userId: string) => Promise<boolean>
  getAdminClient: () => SupabaseClient
}

// ============================================
// Cliente Admin
// ============================================

export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// ============================================
// Funções de criação e limpeza
// ============================================

/**
 * Cria um usuário de teste via Supabase Admin API.
 * O usuário é criado com email_confirm: true (não precisa de confirmação).
 *
 * @param email Email do usuário
 * @param password Senha do usuário
 * @returns ID do usuário criado
 * @throws Erro se a criação falhar
 */
export async function createTestUser(email: string, password: string): Promise<string> {
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    throw new Error(`Erro ao criar usuário: ${error.message}`)
  }

  return data.user.id
}

/**
 * Deleta um usuário pelo email.
 *
 * @param email Email do usuário a ser deletado
 * @returns true se deletado com sucesso, false se não encontrado
 */
export async function deleteTestUserByEmail(email: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const users: Array<{ id: string; email?: string }> = existingUsers?.users ?? []
  const user = users.find((u) => u.email === email)

  if (!user) {
    return false
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  return !error
}

/**
 * Deleta um usuário pelo ID.
 *
 * @param userId ID do usuário a ser deletado
 * @returns true se deletado com sucesso
 */
export async function deleteTestUserById(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  return !error
}

/**
 * Fixture de autenticação.
 * Pode ser usado em testes para criar usuários temporários.
 *
 * @example
 * ```typescript
 * test('meu teste', async ({ auth }) => {
 *   const userId = await auth.createUser('test@example.com', 'password123')
 *   // ... teste ...
 *   await auth.deleteUser('test@example.com')
 * })
 * ```
 */
export const authFixture = {
  createUser: createTestUser,
  deleteUser: deleteTestUserByEmail,
  deleteUserById: deleteTestUserById,
  getAdminClient: createAdminClient,
}

export default authFixture
