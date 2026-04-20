# Design: Correção Offline-First - Orders e Sync

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (Client)                     │
├─────────────────────────────────────────────────────────────┤
│  layout.tsx                                                 │
│    ├── OfflineIndicator (online event → processQueue)       │
│    └── StoreProvider                                        │
│              │                                              │
│              ▼                                              │
│  orderService.ts                                            │
│    └── createOrderFromCart (try-catch → queueOrderForSync)  │
│                                                              │
│  menuStore.ts                                               │
│    └── hydrateFromIndexedDB + getCachedMenu fallback        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    IndexedDB (Dexie)                         │
│    ├── pending_sync (orders)                                │
│    └── menu_cache (categories, products, modifiers)         │
└─────────────────────────────────────────────────────────────┘
```

## Mudanças por Arquivo

### 1. `src/services/orderService.ts`

**Antes:**
```typescript
const response = await fetch('/api/orders', {...})
if (!response.ok) throw new Error(...)
```

**Depois:**
```typescript
let response;
try {
  response = await fetch('/api/orders', {...})
  if (!response.ok) throw new Error(...)
} catch (err) {
  // Offline ou erro de rede → enfileirar para sync
  await queueOrderForSync({ order: orderPayload, items: itemsPayload })
  return {
    id: `offline-${Date.now()}`,
    status: 'pending_sync',
    // ...
  }
}
```

### 2. `src/components/providers/OfflineIndicator.tsx`

**Mudança:**
```typescript
import { processQueue } from '@/lib/offline/sync'

// No onOnline handler:
function onOnline() {
  setIsOnline(true)
  setShowRestored(true)
  setTimeout(() => setShowRestored(false), 3000)
  // Processar fila de pedidos pendentes
  processQueue()
}
```

### 3. `src/stores/menuStore.ts`

**Adicionar:**
- Importar `getCachedMenu` de `@/lib/offline/cache`
- Criar `hydrateFromIndexedDB()` que carrega dados do cache
- Adicionar setter para usar cache quando API falha
- Não é necessário modificar a store em si - usar hook `useMenu` existente

### 4. `src/app/layout.tsx`

**Adicionar:**
```typescript
import { processQueue } from '@/lib/offline/sync'

// Em useEffect do provider ou criar AppInitializer component
useEffect(() => {
  processQueue()
}, [])
```

## Fluxo de Dados

### Order Offline Flow:
```
User submits order
  → createOrderFromCart()
    → fetch('/api/orders') falha (offline)
      → queueOrderForSync({ order, items })
        → IndexedDB: pending_sync.add({...})
    → Retorna Order com id="offline-TIMESTAMP"

User comes back online
  → OfflineIndicator detecta 'online'
    → processQueue()
      → Lê todos de pending_sync
      → fetch('/api/orders') para cada
      → Se sucesso: delete do pending_sync
      → Se falha: atualiza retryCount
```

### Menu Cache Flow:
```
App loads
  → tenta fetch /api/menu
    → Se sucesso: usa dados da API
    → Se falha: chamar getCachedMenu()
      → IndexedDB: menu_cache.get()
      → Se existe e < 24h: usar cache
      → Se não existe: mostrar "sem menu disponível"
```

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Ordem duplicada se fetch falhar mas request chegou | Baixa | Alto | Idempotency key já implementado (linha 152) |
| Menu cache muito antigo (24h+) | Média | Baixo | TTL de 24h; invalidar no admin save |

## Stack de Tecnologias

- **IndexedDB**: Dexie.js para `pending_sync` e `menu_cache`
- **Sync**: `queueOrderForSync()`, `processQueue()` de `@/lib/offline/sync`
- **Cache**: `getCachedMenu()`, `setCachedMenu()` de `@/lib/offline/cache`