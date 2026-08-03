/**
 * E2E (LGPD art. 18): purga de dados locais no logout admin.
 *
 * Espelha o teste de LGPD do cliente (logout.spec.ts), mas exercita o
 * caminho de logout do `app/admin/layout.tsx` — que é o layout ativo em
 * `/admin/*` após a refatoração para o BC `admin/`.
 *
 * Contexto do fix (P0-09 MAJOR):
 *   - O layout admin NÃO usava `logout()` de `@/lib/auth/client`
 *     (que invoca `purgeLocalDataSafely` antes do fetch).
 *   - Em vez disso, fazia `fetch('/api/auth/logout')` direto, deixando
 *     IndexedDB com caches do admin A quando o admin B fazia login.
 *
 * Este teste:
 *   1. Faz login como admin A.
 *   2. Semeia dados PII no IndexedDB (restaurantes, pedidos, etc.).
 *   3. Clica no botão de logout do admin.
 *   4. Verifica que as stores PII canônicas ficaram zeradas após
 *      `purgeAllUserData`.
 *
 * Não cobre o cenário cross-account completo (login B pós-purge), porque
 * o `admin` fixture não suporta re-login no mesmo contexto sem race
 * com o IndexedDB lock. O escopo mínimo — purga observável após logout
 * — é suficiente para capturar regressão no `app/admin/layout.tsx`.
 */
import { test, expect } from '../shared/fixtures';

test.describe('Admin logout e purga LGPD', () => {
  test.beforeAll(() => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL é necessária para o seed E2E');
  });

  test('purga IndexedDB ao clicar em "Sair" no layout admin', async ({ admin, seedData }) => {
    // 1. Confirmar que estamos autenticados como admin e no dashboard.
    await expect(admin).toHaveURL(/\/admin\/dashboard/);

    // 2. Semear dados PII sintéticos no IndexedDB para verificar a purga.
    //    Usa o mesmo DB 'pedi' que `purgeAllUserData` itera (stores
    //    `usuarios`, `pedidos`, `carrinhos`, `pagamentos`, etc.).
    await admin.evaluate(
      async ({ restauranteId }) => {
        const request = indexedDB.open('pedi');
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        const db = request.result;

        const seedPii = async (storeName: string, value: unknown) => {
          try {
            if (!db.objectStoreNames.contains(storeName)) return;
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(value);
            await new Promise<void>((resolve, reject) => {
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
          } catch {
            /* store ausente nesta versão do schema — ignorar */
          }
        };

        await seedPii('usuarios', {
          id: 'admin-a-usuario-pii',
          email: 'admin-a@pedi-ai.test',
          role: 'dono',
        });
        await seedPii('pedidos', {
          id: 'admin-a-pedido-pii',
          restauranteId,
          status: 'pending',
          createdAt: new Date(),
          itens: [],
        });
        await seedPii('carrinhos', {
          id: 'admin-a-carrinho-pii',
          restauranteId,
          itens: [],
        });
        await seedPii('sessoes', {
          id: 'admin-a-sessao-pii',
          userId: 'admin-a',
        });
        db.close();
      },
      { restauranteId: seedData.restaurant.id }
    );

    // 3. Sanity check: garantir que os dados foram semeados nas stores
    //    existentes (algumas podem não existir no schema v2 — usar .onerror).
    const contagensPre = await admin.evaluate(() => {
      return new Promise<number[]>((resolve) => {
        const req = indexedDB.open('pedi');
        req.onerror = () => resolve([0, 0, 0, 0]);
        req.onsuccess = () => {
          const db = req.result;
          const stores = ['usuarios', 'pedidos', 'carrinhos', 'sessoes'];
          const tx = db.transaction(stores, 'readonly');
          Promise.all(
            stores.map(
              (s) =>
                new Promise<number>((res) => {
                  try {
                    const c = tx.objectStore(s).count();
                    c.onsuccess = () => res(c.result);
                    c.onerror = () => res(0);
                  } catch {
                    res(0);
                  }
                })
            )
          ).then((counts) => {
            db.close();
            resolve(counts);
          });
        };
      });
    });
    // Espera-se que ao menos UMA das stores tenha sido semeada (>0).
    // Se nenhuma existe no schema atual, o teste ainda é válido: o
    // assert pós-logout confirma zero em todas.
    expect(contagensPre.some((n) => n > 0)).toBe(true);

    // 4. Clicar no botão de logout do admin. Este é o momento crítico:
    //    se o layout NÃO chamar purgeLocalDataSafely, o assert pós-logout
    //    falha com contagens > 0.
    await admin.click('[data-testid="admin-logout-button"]');
    await expect(admin).toHaveURL(/\/admin\/login/);

    // 5. Verificar que as stores PII canônicas foram purgadas.
    //    Tolera stores ausentes via try/catch (contagem = 0).
    const contagensPos = await admin.evaluate(() => {
      return new Promise<number[]>((resolve) => {
        const req = indexedDB.open('pedi');
        req.onerror = () => resolve([0, 0, 0, 0, 0, 0]);
        req.onsuccess = () => {
          const db = req.result;
          const stores = ['cart', 'pending_sync', 'pedidos', 'carrinhos', 'usuarios', 'sessoes'];
          const tx = db.transaction(stores, 'readonly');
          Promise.all(
            stores.map(
              (s) =>
                new Promise<number>((res) => {
                  try {
                    const c = tx.objectStore(s).count();
                    c.onsuccess = () => res(c.result);
                    c.onerror = () => res(0);
                  } catch {
                    res(0);
                  }
                })
            )
          ).then((counts) => {
            db.close();
            resolve(counts);
          });
        };
      });
    });
    expect(contagensPos).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
