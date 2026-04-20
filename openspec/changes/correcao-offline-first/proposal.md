# Proposal: Correção Offline-First - Orders e Sync

## Intent

Corrigir as violações críticas das regras offline-first do AGENTS.md para que pedidos feitos offline sejam enfileirados e sincronizados automaticamente ao reconectar.

## Scope

### In Scope
- Modificar `orderService.ts` para usar `queueOrderForSync()` quando fetch falhar offline
- Modificar `OfflineIndicator.tsx` para chamar `processQueue()` ao reconectar
- Integrar `getCachedMenu()` em `menuStore.ts` como fallback quando API falhar
- Modificar `menuStore.ts` para hidratar do IndexedDB ao iniciar
- Adicionar `processQueue()` na inicialização da app

### Out of Scope
- Criar nova tabela IndexedDB (já existe `pending_sync`)
- Modificar Service Worker (já está configurado)
- Alterar API de orders (endpoints já existem)

## Approach

1. **Order Service**: Wrap `fetch('/api/orders')` em try-catch; se falhar, chamar `queueOrderForSync()`
2. **OfflineIndicator**: Adicionar `window.addEventListener('online', processQueue)` 
3. **MenuStore**: Ao inicializar, tentar API; se falhar, usar `getCachedMenu()` do cache
4. **App Initialization**: Chamar `processQueue()` no provider raiz

## Affected Areas

| Arquivo | Mudança |
|---------|---------|
| `src/services/orderService.ts` | + try-catch com queueOrderForSync() |
| `src/components/providers/OfflineIndicator.tsx` | + online event listener |
| `src/stores/menuStore.ts` | + hydrateFromIndexedDB + fallback |
| `src/app/(customer)/layout.tsx` ou provider | + processQueue on mount |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Ordem duplicada se fetch falhar mas request chegou | Baixa | Alto | Backend com idempotency key |
| Menu cache muito antigo | Média | Baixo | TTL de 24h no cache |

## Rollback Plan

1. Reverter orderService.ts para call direto
2. Remover online event listener
3. Remover fallback do menuStore
4. Remover processQueue do mount

## Success Criteria

- [ ] Pedidos feitos offline são enfileirados em IndexedDB
- [ ] Ao reconectar, orders pendentes são sincronizados automaticamente
- [ ] Menu fica disponível offline (mesmo que desatualizado)
- [ ] Indicador de sync aparece quando há pending orders
- [ ] Retry com backoff exponencial funciona