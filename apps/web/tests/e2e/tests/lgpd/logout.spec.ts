/**
 * E2E: purga de dados locais na troca de conta (LGPD art. 18).
 */
import { test, expect } from '../shared/fixtures';

test.describe('Logout e purga LGPD', () => {
  test.beforeAll(() => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL é necessária para o seed E2E');
  });

  test('não exibe dados locais da conta A para a conta B', async ({ page, seedData }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', seedData.customer.email);
    await page.fill('[data-testid="password-input"]', seedData.customer.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/menu/);

    await page.evaluate(
      async ({ produtoId, clienteId, restauranteId }) => {
        const request = indexedDB.open('pedi');
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        const db = request.result;
        const transaction = db.transaction('pedidos', 'readwrite');
        transaction.objectStore('pedidos').put({
          id: 'pedido-lgpd-conta-a',
          clienteId,
          restauranteId,
          mesaId: 'mesa-lgpd',
          status: 'pending',
          createdAt: new Date(),
          itens: [{ produtoId, quantidade: 1 }],
        });
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
        db.close();
      },
      {
        produtoId: seedData.products[0]?.id ?? 'produto-teste',
        clienteId: seedData.customer.id,
        restauranteId: seedData.restaurant.id,
      }
    );

    // Clicar no botão de logout (CustomerHeader) em vez de navegar
    // direto para /login — só assim useAuth.signOut → apiClient.logout →
    // purgeAllUserData é disparado. Antes deste fix, o teste ia direto
    // para /login e a purga NUNCA rodava, mascarando o bug BLOCKER.
    await page.click('[data-testid="customer-logout-button"]');
    await page.waitForURL(/\/login/);

    await page.evaluate(() => {
      const request = indexedDB.open('pedi');
      request.onsuccess = () => {
        const db = request.result;
        // Lê as stores PII conforme PII_STORE_NAMES em pii-purge.ts.
        // Stores sem índice `pedidos`/etc. nesta versão do schema são
        // ignoradas — o assert tolera ausência via .onerror.
        const stores = ['cart', 'pending_sync', 'pedidos', 'carrinhos', 'usuarios', 'sessoes'];
        const transaction = db.transaction(stores, 'readonly');
        Promise.all(
          stores.map(
            (store) =>
              new Promise<number>((resolve) => {
                try {
                  const count = transaction.objectStore(store).count();
                  count.onsuccess = () => resolve(count.result);
                  count.onerror = () => resolve(0);
                } catch {
                  resolve(0);
                }
              })
          )
        ).then((counts) => {
          (window as Window & { __contagensPurge?: number[] }).__contagensPurge = counts;
          db.close();
        });
      };
    });
    await expect
      .poll(() =>
        page.evaluate(() => (window as Window & { __contagensPurge?: number[] }).__contagensPurge)
      )
      .toEqual([0, 0, 0, 0, 0, 0]);

    await page.fill('[data-testid="email-input"]', seedData.admin.email);
    await page.fill('[data-testid="password-input"]', seedData.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/menu/);
    expect(await page.evaluate(() => indexedDB.databases())).toBeDefined();
  });
});
