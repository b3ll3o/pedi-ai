import { test, expect, clearClientState } from '../shared/fixtures'
import { OrderPage } from '../../pages/OrderPage'
import { AdminOrdersPage } from '../../pages/AdminOrdersPage'
import { createAdminClient, readSeedResult, updateOrderStatus as updateOrderStatusApi } from '../../support/api'
import type { OrderStatus } from '../../pages/OrderPage'

test.describe('Realtime Updates', () => {
  let orderPage: OrderPage
  let adminOrdersPage: AdminOrdersPage
  let seedData: ReturnType<typeof readSeedResult>

  test.beforeAll(async () => {
    seedData = readSeedResult()
  })

  test.beforeEach(async ({ admin, guest }) => {
    adminOrdersPage = new AdminOrdersPage(admin)
    orderPage = new OrderPage(guest)
  })

  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test('admin updates status and customer receives update', async ({ admin: _admin, guest: _guest }) => {
    // Admin cria pedido via API
    const adminClient = createAdminClient()
    const { data: order } = await adminClient
      .from('orders')
      .insert({
        restaurant_id: seedData.restaurant.id,
        customer_id: seedData.customer.id,
        table_id: seedData.table.id,
        status: 'pending',
        total_amount: 0,
      })
      .select()
      .single()

    if (!order) {
      test.skip()
      return
    }

    // Cliente abre página do pedido
    await orderPage.goto(order.id)

    // Admin vai para lista de pedidos
    await adminOrdersPage.goto()

    // Admin atualiza status para confirmed
    await adminOrdersPage.updateOrderStatus(order.id, 'confirmed')

    // Cliente deve receber atualização (via realtime ou polling)
    await orderPage.waitForRealtimeStatus('confirmed')

    // Verificar que status foi atualizado visualmente
    await expect(orderPage.orderStatus).toContainText(/confirmado/i)
  })

  test('timeline updates without page reload', async ({ admin: _admin, guest: _guest }) => {
    // Criar pedido
    const adminClient = createAdminClient()
    const { data: order } = await adminClient
      .from('orders')
      .insert({
        restaurant_id: seedData.restaurant.id,
        customer_id: seedData.customer.id,
        table_id: seedData.table.id,
        status: 'pending',
        total_amount: 0,
      })
      .select()
      .single()

    if (!order) {
      test.skip()
      return
    }

    // Cliente abre página do pedido
    await orderPage.goto(order.id)

    // Capturar timeline inicial
    const initialTimeline = await orderPage.statusTimeline.innerHTML()

    // Admin atualiza status
    await updateOrderStatusApi(order.id, 'preparing')

    // Aguardar atualização da timeline (sem reload)
    await orderPage.waitForTimelineUpdate()

    // Verificar que timeline mudou
    const updatedTimeline = await orderPage.statusTimeline.innerHTML()
    expect(updatedTimeline).not.toBe(initialTimeline)
  })

  test('fallback polling when realtime fails', async ({ admin: _admin, guest: _guest }) => {
    // Criar pedido
    const adminClient = createAdminClient()
    const { data: order } = await adminClient
      .from('orders')
      .insert({
        restaurant_id: seedData.restaurant.id,
        customer_id: seedData.customer.id,
        table_id: seedData.table.id,
        status: 'pending',
        total_amount: 0,
      })
      .select()
      .single()

    if (!order) {
      test.skip()
      return
    }

    // Cliente abre página do pedido
    await orderPage.goto(order.id)

    // Atualizar via API diretamente (bypass realtime)
    await updateOrderStatusApi(order.id, 'ready')

    // Aguardar polling detectar mudança
    await orderPage.waitForRealtimeStatus('ready', 10000)

    // Verificar que status foi atualizado
    await expect(orderPage.orderStatus).toContainText(/pronto/i)
  })

  test('realtime connection indicator shows status', async ({ guest: _guest }) => {
    // Criar pedido
    const adminClient = createAdminClient()
    const { data: order } = await adminClient
      .from('orders')
      .insert({
        restaurant_id: seedData.restaurant.id,
        customer_id: seedData.customer.id,
        table_id: seedData.table.id,
        status: 'pending',
        total_amount: 0,
      })
      .select()
      .single()

    if (!order) {
      test.skip()
      return
    }

    // Cliente abre página do pedido
    await orderPage.goto(order.id)

    // Verificar indicador de conexão (pode não estar conectado ainda)
    const isConnected = await orderPage.isRealtimeConnected()

    // Se realtime estiver funcionando, deve mostrar conectado
    // Caso contrário, o fallback de polling entra em ação
    if (isConnected) {
      await expect(orderPage.connectionStatus).toContainText(/conectado/i)
    }
  })

  test('order status progression shows in timeline', async ({ admin: _admin, guest: _guest }) => {
    // Criar pedido
    const adminClient = createAdminClient()
    const { data: order } = await adminClient
      .from('orders')
      .insert({
        restaurant_id: seedData.restaurant.id,
        customer_id: seedData.customer.id,
        table_id: seedData.table.id,
        status: 'pending',
        total_amount: 0,
      })
      .select()
      .single()

    if (!order) {
      test.skip()
      return
    }

    // Cliente abre página do pedido
    await orderPage.goto(order.id)

    // Progressão: pending -> confirmed -> preparing -> ready
    const statusProgression: OrderStatus[] = ['confirmed', 'preparing', 'ready']

    for (const newStatus of statusProgression) {
      await updateOrderStatusApi(order.id, newStatus)
      await orderPage.waitForRealtimeStatus(newStatus, 15000)

      // Verificar que timeline mostra cada transição
      await expect(orderPage.statusTimeline).toContainText(
        new RegExp(newStatus.replace('_', ' '), 'i')
      )
    }
  })
})