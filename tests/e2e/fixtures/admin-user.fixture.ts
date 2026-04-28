/**
 * Fixture de usuário admin para testes E2E.
 *
 * Fornece funções para criar e limpar usuários admin com roles
 * (owner/manager/staff) e criar perfis associados.
 * Usa Supabase Admin API (service role key).
 *
 * @module fixtures/admin-user.fixture
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

// Prefixo para identificar dados de teste (idempotência)
const SEED_PREFIX = 'e2e+'
const TEST_PASSWORD = 'E2ETestPassword123!'

// Roles disponíveis para usuários admin
export type AdminRole = 'owner' | 'manager' | 'staff'

// ============================================
// Tipos
// ============================================

export interface AdminUser {
  id: string
  email: string
  password: string
  role: AdminRole
}

export interface AdminUserWithProfile extends AdminUser {
  restaurant_id: string
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
 * Gera email de teste com prefixo e sufixo único.
 *
 * @param role Role do usuário (owner/manager/staff)
 * @param suffix Suffixo adicional para tornar único
 * @returns Email formatado
 */
export function generateTestEmail(role: AdminRole, suffix = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const suffixPart = suffix ? `-${suffix}` : ''
  return `${SEED_PREFIX}${role}+${timestamp}+${random}${suffixPart}@pedi-ai.test`
}

/**
 * Obtém a senha padrão de teste.
 *
 * @returns Senha padrão para usuários de teste
 */
export function getTestPassword(): string {
  return TEST_PASSWORD
}

/**
 * Cria um usuário admin via Supabase Admin API.
 * O usuário é criado com email_confirm: true.
 *
 * @param role Role do usuário (owner/manager/staff)
 * @param email Email opcional (gerado automaticamente se não fornecido)
 * @param password Senha opcional (usada padrão se não fornecida)
 * @returns ID do usuário criado
 */
export async function createAdminUser(
  role: AdminRole,
  email?: string,
  password?: string
): Promise<string> {
  const admin = createAdminClient()
  const userEmail = email || generateTestEmail(role)
  const userPassword = password || TEST_PASSWORD

  const { data, error } = await admin.auth.admin.createUser({
    email: userEmail,
    password: userPassword,
    email_confirm: true,
  })

  if (error) {
    throw new Error(`Erro ao criar usuário ${role}: ${error.message}`)
  }

  return data.user.id
}

/**
 * Cria perfil de usuário admin com role.
 *
 * @param userId ID do usuário
 * @param email Email do usuário
 * @param role Role do usuário (owner/manager/staff)
 * @param restaurantId ID do restaurante (opcional, obtido do restaurant de teste se não fornecido)
 * @returns true se criado com sucesso
 */
export async function createAdminProfile(
  userId: string,
  email: string,
  role: AdminRole,
  restaurantId?: string
): Promise<boolean> {
  const admin = createAdminClient()

  // Obter restaurant ID se não fornecido
  let restaurantUuid = restaurantId
  if (!restaurantUuid) {
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id')
      .eq('name', 'Restaurant E2E Test')
      .maybeSingle()

    if (!restaurant) {
      throw new Error('Restaurant de teste não encontrado. Execute o seed primeiro.')
    }

    restaurantUuid = restaurant.id as string
  }

  const roleMapping: Record<AdminRole, string> = {
    owner: 'dono',
    manager: 'gerente',
    staff: 'atendente',
  }

  const { error } = await admin.from('users_profiles').insert({
    user_id: userId,
    email,
    name: `${role.charAt(0).toUpperCase() + role.slice(1)} Test`,
    role: roleMapping[role],
    restaurant_id: restaurantUuid,
  })

  if (error) {
    throw new Error(`Erro ao criar perfil: ${error.message}`)
  }

  return true
}

/**
 * Cria usuário admin completo (usuário + perfil).
 *
 * @param role Role do usuário (owner/manager/staff)
 * @param email Email opcional
 * @param password Senha opcional
 * @param restaurantId ID do restaurante opcional
 * @returns Dados do usuário criado (exceto senha)
 */
export async function createAdminUserComplete(
  role: AdminRole,
  email?: string,
  password?: string,
  restaurantId?: string
): Promise<AdminUserWithProfile> {
  const userEmail = email || generateTestEmail(role)
  const userPassword = password || TEST_PASSWORD

  const userId = await createAdminUser(role, userEmail, userPassword)
  await createAdminProfile(userId, userEmail, role, restaurantId)

  return {
    id: userId,
    email: userEmail,
    password: userPassword,
    role,
    restaurant_id: restaurantId || '',
  }
}

/**
 * Deleta um usuário admin pelo email.
 *
 * @param email Email do usuário a ser deletado
 * @returns true se deletado com sucesso, false se não encontrado
 */
export async function deleteAdminUserByEmail(email: string): Promise<boolean> {
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
 * Deleta um usuário admin pelo ID.
 *
 * @param userId ID do usuário a ser deletado
 * @returns true se deletado com sucesso
 */
export async function deleteAdminUserById(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  return !error
}

/**
 * Lista usuários admin de teste.
 *
 * @returns Lista de usuários de teste
 */
export async function listTestAdminUsers(): Promise<Array<{ id: string; email: string; role: string }>> {
  const admin = createAdminClient()
  const { data: existingUsers } = await admin.auth.admin.listUsers()

  const users: Array<{ id: string; email?: string }> = existingUsers?.users ?? []
  return users
    .filter((u) => u.email?.startsWith(SEED_PREFIX))
    .map((u) => ({
      id: u.id,
      email: u.email!,
      role: u.email!.includes('+owner+') ? 'owner' :
            u.email!.includes('+manager+') ? 'manager' :
            u.email!.includes('+staff+') ? 'staff' : 'unknown',
    }))
}

/**
 * Deleta todos os usuários admin de teste.
 *
 * @returns Número de usuários deletados
 */
export async function deleteAllTestAdminUsers(): Promise<number> {
  const admin = createAdminClient()
  const { data: existingUsers } = await admin.auth.admin.listUsers()

  let deletedCount = 0
  const users: Array<{ id: string; email?: string }> = existingUsers?.users ?? []

  for (const user of users) {
    if (user.email && user.email.startsWith(SEED_PREFIX)) {
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (!error) {
        deletedCount++
      }
    }
  }

  return deletedCount
}

/**
 * Fixture de usuário admin.
 *
 * @example
 * ```typescript
 * test('meu teste', async ({ adminUser }) => {
 *   const user = await adminUser.create('owner')
 *   // ... teste ...
 *   await adminUser.delete(user.email)
 * })
 * ```
 */
export const adminUserFixture = {
  create: createAdminUser,
  createWithProfile: createAdminUserComplete,
  createProfile: createAdminProfile,
  delete: deleteAdminUserByEmail,
  deleteById: deleteAdminUserById,
  list: listTestAdminUsers,
  deleteAll: deleteAllTestAdminUsers,
  generateEmail: generateTestEmail,
  getPassword: getTestPassword,
  createAdminClient,
}

export default adminUserFixture
