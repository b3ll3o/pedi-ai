/**
 * Fixtures compartilhados para testes E2E.
 *
 * Exporta todos os fixtures de forma centralizada.
 *
 * @module fixtures
 */

// Re-export fixtures
export {
  authFixture,
  createTestUser,
  deleteTestUserByEmail,
  deleteTestUserById,
  createAdminClient,
  type TestUser,
  type AuthFixture,
} from './auth.fixture'

export {
  restaurantFixture,
  getOrCreateTestRestaurant,
  deleteTestRestaurant,
  createTestCategory,
  createTestProduct,
  createTestTable,
  deleteTablesByRestaurant,
  createAdminClient as createRestaurantAdminClient,
  TEST_RESTAURANT_NAME,
  type TestRestaurant,
  type TestCategory,
  type TestProduct,
  type TestTable,
} from './restaurant.fixture'

export {
  adminUserFixture,
  createAdminUser,
  createAdminUserComplete,
  createAdminProfile,
  deleteAdminUserByEmail,
  deleteAdminUserById,
  listTestAdminUsers,
  deleteAllTestAdminUsers,
  generateTestEmail,
  getTestPassword,
  createAdminClient as createAdminUserAdminClient,
  type AdminRole,
  type AdminUser,
  type AdminUserWithProfile,
} from './admin-user.fixture'
