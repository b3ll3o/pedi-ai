# Tasks: Correção Offline-First - Orders e Sync

## Tarefa 1: Modificar orderService.ts para enfileirar pedidos offline

**Arquivo:** `src/services/orderService.ts`
**Linha:** ~173 (após fetch)
**Verificação:** `grep -n 'queueOrderForSync\|catch' src/services/orderService.ts`

- [x] 1.1 Importar `queueOrderForSync` de `@/lib/offline/sync`
- [x] 1.2 Wrap `fetch('/api/orders')` em try-catch
- [x] 1.3 No catch: chamar `queueOrderForSync({ order: orderPayload, items: itemsPayload })`
- [x] 1.4 Retornar Order mock com status `pending_sync` e id temporário
- [x] 1.5 Testar que offline simulation causa enfileiramento

---

## Tarefa 2: Modificar OfflineIndicator para chamar processQueue no online

**Arquivo:** `src/components/providers/OfflineIndicator.tsx`
**Verificação:** `grep -n 'processQueue' src/components/providers/OfflineIndicator.tsx`

- [x] 2.1 Importar `processQueue` de `@/lib/offline/sync`
- [ ] 2.2 No handler `onOnline`: adicionar chamada `processQueue()`
- [ ] 2.3 Verificar que sync ocorre após reconexão

---

## Tarefa 3: Integrar getCachedMenu() em menuStore como fallback

**Arquivo:** `src/stores/menuStore.ts`
**Verificação:** `grep -n 'getCachedMenu' src/stores/menuStore.ts`

- [~] 3.1 Criar função/hook `useHydratedMenu()` que tenta API e usa cache no fallback
- [ ] 3.2 Importar `getCachedMenu` de `@/lib/offline/cache`
- [ ] 3.3 Implementar fallback: se fetch falhar, usar cache
- [ ] 3.4 Documentar que `useMenu` hook já faz hydrate automaticamente

---

## Tarefa 4: Adicionar processQueue() na inicialização da app

**Arquivo:** `src/app/layout.tsx` ou `src/components/providers/StoreProvider.tsx`
**Verificação:** `grep -rn 'processQueue' src/app/ src/components/providers/`

- [x] 4.1 Criar `AppInitializer` component que chama `processQueue()` no mount
- [x] 4.2 Adicionar ao layout raiz (dentro de StoreProvider)
- [x] 4.3 Verificar que pedidos pendentes são sincronizados ao recarregar app

---

## Tarefa 5: Verificação e Testes

- [x] 5.1 Verificar TypeScript: `pnpm tsc --noEmit`
- [x] 5.2 Verificar build: `pnpm build`
- [x] 5.3 Rodar testes unitários: `pnpm test --run`
- [x] 5.4 Testar fluxo offline manualmente (desconectar rede, fazer pedido, reconectar)