/**
 * Wrapper best-effort para `purgeAllUserData` que tolera ausência de
 * IndexedDB (SSR / Node / testes sem fake-indexeddb) e erros internos.
 *
 * Usado por `apiClient.logout()` e `lib/auth/client.logout()` para garantir
 * que a purga local aconteça em TODOS os caminhos de logout — sem precisar
 * que cada chamador envolva em try/catch.
 *
 * Erros são logados em `console.warn` (não `console.error`) para não
 * poluir telemetria de produção em cenários esperados (SSR).
 */

export async function purgeLocalDataSafely(): Promise<void> {
  // SSR / Node: sem IndexedDB, nada a fazer.
  if (typeof indexedDB === 'undefined' || typeof window === 'undefined') {
    return;
  }

  try {
    // Dynamic import para evitar carregar Dexie em bundles que rodam
    // server-side (ex.: app/api/auth/logout/route.ts → apiClient.logout).
    // A função `purgeAllUserData` já tem guard isBrowser(), mas a
    // inicialização do módulo (`new PediDatabase()` no top-level de
    // `lib/offline/db.ts`) falha em Node por ausência de `indexedDB`.
    const { purgeAllUserData } = await import('./pii-purge');
    await purgeAllUserData();
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[logout] Falha ao purgar dados locais (não-bloqueante):', err);
    }
  }
}
