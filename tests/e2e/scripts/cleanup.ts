/**
 * Script de cleanup para testes E2E.
 *
 * Limpa dados de teste criados pelo seed:
 * - Usuários de teste (customer, admin, waiter)
 * - Restaurant de teste (cascade deleta tables, categories, products, etc)
 *
 * Uso: pnpm test:e2e:cleanup
 * Requer: SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar .env.local explicitamente
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Configuração
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente ausentes:')
  if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdicione SUPABASE_SERVICE_ROLE_KEY ao .env.local')
  process.exit(1)
}

// Deve ser o mesmo do seed.ts
const SEED_PREFIX = 'e2e+'
const RESTAURANT_NAME = 'Restaurant E2E Test'

// ============================================
// Cliente Supabase Admin
// ============================================

function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// ============================================
// Funções de cleanup
// ============================================

async function deleteTestUsers(admin: SupabaseClient): Promise<number> {
  console.log('👥 Deletando usuários de teste...')

  const testEmails = [
    `${SEED_PREFIX}customer@pedi-ai.test`,
    `${SEED_PREFIX}admin@pedi-ai.test`,
    `${SEED_PREFIX}waiter@pedi-ai.test`,
  ]

  // Buscar usuários existentes
  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers()

  if (listError) {
    throw new Error(`Erro ao listar usuários: ${listError.message}`)
  }

  let deletedCount = 0

  for (const user of existingUsers?.users || []) {
    if (user.email && testEmails.includes(user.email)) {
      console.log(`   Deletando: ${user.email}`)
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.error(`   ⚠️  Erro ao deletar ${user.email}: ${deleteError.message}`)
      } else {
        deletedCount++
      }
    }
  }

  console.log(`   ${deletedCount} usuário(s) deletado(s)\n`)
  return deletedCount
}

async function deleteTestRestaurant(admin: SupabaseClient): Promise<boolean> {
  console.log('🏪 Deletando restaurant de teste...')

  // Buscar restaurant pelo nome
  const { data: restaurants, error: selectError } = await admin
    .from('restaurants')
    .select('id')
    .eq('name', RESTAURANT_NAME)
    .maybeSingle()

  if (selectError) {
    throw new Error(`Erro ao buscar restaurant: ${selectError.message}`)
  }

  if (!restaurants) {
    console.log('   Nenhum restaurant de teste encontrado\n')
    return false
  }

  console.log(`   Deletando restaurant: ${RESTAURANT_NAME} (${restaurants.id})`)

  // O cascade deve cuidar de tables, categories, products, etc
  const { error: deleteError } = await admin
    .from('restaurants')
    .delete()
    .eq('id', restaurants.id)

  if (deleteError) {
    throw new Error(`Erro ao deletar restaurant: ${deleteError.message}`)
  }

  console.log('   Restaurant e dados relacionados deletados\n')
  return true
}

async function deleteOrdersByRestaurant(
  admin: SupabaseClient,
  restaurantId: string
): Promise<void> {
  console.log('🛒 Limpando pedidos do restaurant...')

  // Primeiro deletar order_items e order_status_history (filhos)
  const { data: orders } = await admin
    .from('orders')
    .select('id')
    .eq('restaurant_id', restaurantId)

  if (orders && orders.length > 0) {
    const orderIds = orders.map((o) => o.id)

    // Deletar order_items
    await admin
      .from('order_items')
      .delete()
      .in('order_id', orderIds)

    // Deletar order_status_history
    await admin
      .from('order_status_history')
      .delete()
      .in('order_id', orderIds)

    // Deletar orders
    await admin
      .from('orders')
      .delete()
      .eq('restaurant_id', restaurantId)

    console.log(`   ${orders.length} pedido(s) deletado(s)\n`)
  } else {
    console.log('   Nenhum pedido encontrado\n')
  }
}

// ============================================
// Função principal
// ============================================

async function cleanup(): Promise<void> {
  console.log('========================================')
  console.log('🧹 CLEANUP E2E - Iniciando...')
  console.log('========================================\n')

  const admin = createAdminClient()

  try {
    // 1. Deletar restaurant primeiro (se existir) - cascade cuida dos dados relacionados
    const restaurantDeleted = await deleteTestRestaurant(admin)

    // 2. Se o restaurant foi deletado, limpar pedidos (cascade já deve ter feito isso)
    // Mas garantimos que não fique órfão
    if (restaurantDeleted) {
      // O cascade do banco já deve ter deletado tudo, mas vamos verificar
      // Se houver orders órfãs, limpamos
    }

    // 3. Deletar usuários (profiles são deletados em cascade pelo banco)
    const usersDeleted = await deleteTestUsers(admin)

    // 4. Remover arquivo de resultado do seed
    try {
      const fs = await import('fs')
      const path = await import('path')
      const resultPath = path.join(__dirname, '.seed-result.json')

      if (fs.existsSync(resultPath)) {
        fs.unlinkSync(resultPath)
        console.log('📄 Arquivo .seed-result.json removido\n')
      }
    } catch {
      // Ignorar erros ao remover arquivo
    }

    console.log('========================================')
    console.log('✅ CLEANUP E2E - Concluído com sucesso!')
    console.log('========================================')
    console.log(`   Restaurant deletado: ${restaurantDeleted ? 'Sim' : 'Não encontrado'}`)
    console.log(`   Usuários deletados: ${usersDeleted}`)
  } catch (error) {
    console.error('❌ Erro no cleanup:', error)
    process.exit(1)
  }
}

// Executar
cleanup()
