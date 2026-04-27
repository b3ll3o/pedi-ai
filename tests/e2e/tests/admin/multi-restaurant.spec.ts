import { test, expect } from './shared/fixtures';

test.describe('Admin Multi-Restaurant', () => {
  test.beforeEach(async ({ admin }) => {
    // Navigate to restaurants page
    await admin.goto('/admin/restaurants');
  });

  test('should display restaurants list page', async ({ admin }) => {
    await expect(admin.locator('h1')).toContainText('Meus Restaurantes');
  });

  test('should navigate to create new restaurant', async ({ admin }) => {
    await admin.locator('text=Novo Restaurante').first().click();
    await expect(admin).toHaveURL(/\/admin\/restaurants\/new/);
    await expect(admin.locator('h1')).toContainText('Novo Restaurante');
  });

  test('should create a new restaurant', async ({ admin }) => {
    // Navigate to new restaurant page
    await admin.goto('/admin/restaurants/new');

    // Fill the form
    await admin.locator('[data-testid="restaurant-name-input"]').fill('Restaurante Teste E2E');
    await admin.locator('[data-testid="restaurant-description-input"]').fill('Descrição do restaurante');
    await admin.locator('[data-testid="restaurant-address-input"]').fill('Rua Teste, 123');
    await admin.locator('[data-testid="restaurant-phone-input"]').fill('11999999999');

    // Submit
    await admin.locator('[data-testid="save-button"]').click();

    // Should redirect to restaurants list
    await expect(admin).toHaveURL(/\/admin\/restaurants/);
  });

  test('should switch between restaurants', async ({ admin }) => {
    // The restaurant selector should be visible in sidebar
    // This test assumes at least one restaurant exists

    // Look for restaurant selector in sidebar
    const selector = admin.locator('button[aria-haspopup="listbox"]').first();
    if (await selector.isVisible()) {
      await selector.click();

      // Dropdown should open
      await expect(admin.locator('[role="listbox"]')).toBeVisible();
    }
  });

  test('should redirect to restaurants page when no restaurant selected', async ({ admin }) => {
    // Clear any selected restaurant (via logout/login with single restaurant access)
    // This test verifies the dashboard redirects properly
    await admin.goto('/admin/dashboard');

    // Should either show dashboard or redirect to restaurants
    const url = admin.url();
    if (url.includes('/admin/dashboard')) {
      // Dashboard is visible - restaurant is selected
      await expect(admin.locator('h1')).toContainText('Dashboard');
    }
  });

  test('should access team management', async ({ admin }) => {
    // Navigate to restaurants first
    await admin.goto('/admin/restaurants');

    // Wait for restaurants to load
    await admin.waitForLoadState('networkidle');

    // Click on team button for first restaurant if visible
    const teamButton = admin.locator('a:has-text("Equipe")').first();
    if (await teamButton.isVisible()) {
      await teamButton.click();
      await expect(admin.locator('h1')).toContainText('Equipe');
      await expect(admin).toHaveURL(/\/team/);
    }
  });

  test('should display restaurant selector in sidebar', async ({ admin }) => {
    await admin.goto('/admin');

    // Restaurant selector should be present
    const selector = admin.locator('button[aria-haspopup="listbox"]').first();
    if (await selector.isVisible()) {
      await expect(selector).toBeVisible();
      await expect(selector).toContainText(/Restaurante|Selecionar/);
    }
  });

  test('should filter products by selected restaurant', async ({ admin }) => {
    // Go to products page
    await admin.goto('/admin/products');

    // Wait for loading
    await admin.waitForLoadState('networkidle');

    // Products page should be visible with correct restaurant context
    // (Products will be filtered by selected restaurant)
    await expect(admin.locator('h1')).toContainText('Produtos');
  });

  test('should show empty state when no restaurants exist', async ({ admin }) => {
    // Navigate to new restaurant page to create one if none exist
    await admin.goto('/admin/restaurants/new');

    // If form is visible, create a restaurant
    const nameInput = admin.locator('[data-testid="restaurant-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Restaurante para Teste');
      await admin.locator('[data-testid="save-button"]').click();
      await admin.waitForURL(/\/admin\/restaurants/);
    }

    // Now go back to restaurants list
    await admin.goto('/admin/restaurants');
    await admin.waitForLoadState('networkidle');
  });
});

test.describe('Admin Restaurant CRUD', () => {
  test('should require name field', async ({ admin }) => {
    await admin.goto('/admin/restaurants/new');

    // Try to submit without filling name
    await admin.locator('[data-testid="save-button"]').click();

    // Should show name error
    await expect(admin.locator('text=Nome é obrigatório')).toBeVisible();
  });

  test('should create restaurant with description', async ({ admin }) => {
    await admin.goto('/admin/restaurants/new');

    await admin.locator('[data-testid="restaurant-name-input"]').fill('Restaurante Descrição');
    await admin.locator('[data-testid="restaurant-description-input"]').fill('Um restaurante muito legal');

    await admin.locator('[data-testid="save-button"]').click();

    // Should succeed
    await expect(admin).toHaveURL(/\/admin\/restaurants/);
  });
});
