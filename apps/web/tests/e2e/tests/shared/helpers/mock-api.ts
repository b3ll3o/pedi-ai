/**
 * Mocks de API para testes E2E com Playwright.
 * Permite interceptar chamadas API comuns durante os testes.
 */
import { Page, Route } from '@playwright/test'

/**
 * Dados mockados para respostas da API.
 */
export const MOCK_DATA = {
  // Cardápio
  menu: {
    categories: [
      { id: 'cat_1', name: 'Bebidas', description: 'Bebidas do cardápio' },
      { id: 'cat_2', name: 'Pratos Principais', description: 'Pratos principais' },
      { id: 'cat_3', name: 'Sobremesas', description: 'Sobremesas' },
    ],
    products: [
      { id: 'prod_1', name: 'Coca-Cola', price: 5.99, categoryId: 'cat_1' },
      { id: 'prod_2', name: 'Picanha', price: 45.99, categoryId: 'cat_2' },
      { id: 'prod_3', name: 'Tiramisu', price: 15.99, categoryId: 'cat_3' },
    ],
  },

  // Mesa
  table: {
    id: 'table_1',
    code: 'MESA01',
    name: 'Mesa 1',
    status: 'available',
  },

  // Pedidos
  orders: {
    list: {
      orders: [
        {
          id: 'order_1',
          tableId: 'table_1',
          status: 'pending',
          total: 51.98,
          items: [
            { productId: 'prod_1', quantity: 2, price: 5.99 },
            { productId: 'prod_2', quantity: 1, price: 45.99 },
          ],
          createdAt: new Date().toISOString(),
        },
      ],
    },
    statuses: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'],
  },

  // Sessão / Usuário
  session: {
    user: {
      id: 'user_1',
      email: 'customer@test.com',
      name: 'Cliente Teste',
      role: 'CUSTOMER',
    },
  },
} as const

/**
 * Configuração de mock para uma rota.
 */
interface MockRoute {
  urlPattern: string | RegExp
  response: object | ((route: Route) => Promise<void>)
  status?: number
}

/**
 * Mock padrão para rotas de cardápio.
 */
const DEFAULT_MENU_MOCKS: MockRoute[] = [
  {
    urlPattern: '**/api/menu/categories',
    response: MOCK_DATA.menu.categories,
  },
  {
    urlPattern: '**/api/menu/products',
    response: MOCK_DATA.menu.products,
  },
]

/**
 * Mock padrão para rotas de mesa.
 */
const DEFAULT_TABLE_MOCKS: MockRoute[] = [
  {
    urlPattern: '**/api/tables/**',
    response: MOCK_DATA.table,
  },
]

/**
 * Mock padrão para pedidos.
 */
const DEFAULT_ORDERS_MOCKS: MockRoute[] = [
  {
    urlPattern: '**/api/orders',
    response: MOCK_DATA.orders.list,
  },
]

/**
 * Registra mocks de API na página.
 * @param page Página do Playwright
 * @param routes Mock routes adicionais para registrar
 */
export async function mockAPI(page: Page, routes: MockRoute[] = []): Promise<void> {
  const allRoutes = [...DEFAULT_MENU_MOCKS, ...DEFAULT_TABLE_MOCKS, ...DEFAULT_ORDERS_MOCKS, ...routes]

  for (const mock of allRoutes) {
    await page.route(mock.urlPattern, async (route: Route) => {
      if (typeof mock.response === 'function') {
        await mock.response(route)
        return
      }

      await route.fulfill({
        status: mock.status ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(mock.response),
      })
    })
  }
}

/**
 * Registra mocks específicos para testes de checkout.
 */
export async function mockCheckout(page: Page): Promise<void> {
  await mockAPI(page, [
    {
      urlPattern: '**/api/orders',
      response: {
        order: {
          id: `order_${Date.now()}`,
          status: 'pending',
          total: 51.98,
          items: [
            { productId: 'prod_1', quantity: 2, price: 5.99 },
            { productId: 'prod_2', quantity: 1, price: 45.99 },
          ],
          createdAt: new Date().toISOString(),
        },
      },
    },
    {
      urlPattern: '**/api/payments/create',
      response: {
        paymentId: `pay_${Date.now()}`,
        status: 'pending',
        amount: 51.98,
      },
    },
  ])
}

/**
 * Registra mocks para testes de autenticação.
 */
export async function mockAuth(page: Page): Promise<void> {
  await mockAPI(page, [
    {
      urlPattern: '**/api/auth/session',
      response: MOCK_DATA.session,
    },
  ])
}
