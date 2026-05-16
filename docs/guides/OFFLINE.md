# Guia de Implementação Offline-First — Pedi-AI

> **Última atualização:** 2026-04-28  
> **Versão do Service Worker:** Workbox 8.x  
> **Banco local:** Dexie (IndexedDB)

---

## 1. Visão Geral

O Pedi-AI funciona **100% offline**. O cliente pode navegar pelo cardápio, montar o carrinho e fazer pedidos mesmo sem conexão com a internet. Quando a conexão é restaurada, todos os dados são sincronizados automaticamente com o servidor Supabase.

### Stack Offline

| Tecnologia           | Função                                            |
| -------------------- | ------------------------------------------------- |
| **Dexie**            | Wrapper IndexedDB para persistência local         |
| **Workbox**          | Service Worker para caching de assets e API       |
| **BackgroundSync**   | Fila de pedidos para sync automático              |
| **BroadcastChannel** | Sincronização de carrinho entre abas do navegador |

### Fluxo de Dados Offline

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌───────────┐
│   Browser   │────▶│  IndexedDB   │────▶│   Zustand Store   │────▶│    UI     │
│  (Cliente)  │     │   (Dexie)    │     │   (cartStore)    │     │           │
└─────────────┘     └──────────────┘     └───────────────────┘     └───────────┘
                           │                       ▲
                           │                       │
                    ┌──────▼───────────────────────┴─────┐
                    │         Service Worker             │
                    │   (Workbox + BackgroundSync)       │
                    └────────────────┬───────────────────┘
                                     │
                    ┌────────────────▼───────────────────┐
                    │           Supabase API             │
                    │     ( quando online )              │
                    └────────────────────────────────────┘
```

---

## 2. Arquitetura Offline

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NAVEGADOR                                           │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          SERVICE WORKER                                   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │    │
│  │  │ CacheFirst  │  │NetworkFirst │  │StaleWhile   │  │Background    │   │    │
│  │  │ (static,    │  │ (menu API,  │  │Revalidate   │  │SyncPlugin    │   │    │
│  │  │  images,    │  │  documents) │  │ (general     │  │(orders-queue│   │    │
│  │  │  fonts)     │  │             │  │  API GET)   │  │  24h retry)  │   │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│  ┌───────────────────────────────────▼───────────────────────────────────────┐    │
│  │                         IndexedDB (Dexie)                                 │    │
│  │  ┌──────────┐  ┌────────────┐  ┌─────────────┐  ┌────────────┐        │    │
│  │  │  cart    │  │ menu_cache │  │ pending_sync│  │ tables_info│        │    │
│  │  │ (itens)  │  │ (cardápio) │  │  (pedidos)  │  │  (mesas)   │        │    │
│  │  └──────────┘  └────────────┘  └─────────────┘  └────────────┘        │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│  ┌───────────────────────────────────▼───────────────────────────────────────┐    │
│  │                         ZUSTAND STORES                                     │    │
│  │  ┌─────────────────┐           ┌─────────────────┐                      │    │
│  │  │   cartStore     │◀─────────▶│ BroadcastChannel │                      │    │
│  │  │  ( estado UI )  │           │ ( cross-tab sync)│                      │    │
│  │  └─────────────────┘           └─────────────────┘                      │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │         SUPABASE (online)          │
                    │   PostgreSQL + Realtime + Auth     │
                    └─────────────────────────────────────┘
```

### Ciclo de Vida

1. **App Load:** `StoreProvider` hidrata carrinho do IndexedDB (`hydrateCartFromIndexedDB`)
2. **Navegação:** Service Worker intercepta requisições e serve do cache
3. **Pedido Offline:** Dado salvo em `pending_sync`, sync acionado quando online
4. **Reconexão:** `OfflineIndicator` detecta `online`, chama `processQueue()`
5. **Cross-Tab:** BroadcastChannel mantém carrinho sincronizado entre abas

---

## 3. Schema Dexie

O banco `pedi` (nome: `pedi`) contém 4 tabelas:

```typescript
// apps/web/src/lib/offline/db.ts
export class PediDatabase extends Dexie {
  cart!: Table<CartItem>;
  menu_cache!: Table<MenuCache>;
  pending_sync!: Table<PendingSync>;
  tables_info!: Table<TableInfo>;
}
```

### Tabela `cart`

Armazena os itens do carrinho de compras.

| Campo       | Tipo                      | Índice      | Descrição                          |
| ----------- | ------------------------- | ----------- | ---------------------------------- |
| `id`        | `number`                  | `++id`      | Chave primária auto-increment      |
| `productId` | `string`                  | `productId` | ID do produto                      |
| `quantity`  | `number`                  | —           | Quantidade                         |
| `modifiers` | `Record<string, unknown>` | —           | Modificadores selecionados         |
| `price`     | `number`                  | —           | Preço total (unitPrice × quantity) |
| `createdAt` | `Date`                    | `createdAt` | Timestamp de criação               |

**Código:**

```typescript
cart: '++id, productId, createdAt';
```

### Tabela `menu_cache`

Cache do cardápio para navegação offline.

| Campo          | Tipo        | Índice         | Descrição                     |
| -------------- | ----------- | -------------- | ----------------------------- |
| `id`           | `number`    | `++id`         | Chave primária auto-increment |
| `restaurantId` | `string`    | `restaurantId` | ID do restaurante             |
| `categories`   | `unknown[]` | —              | Categorias do cardápio        |
| `products`     | `unknown[]` | —              | Produtos do cardápio          |
| `modifiers`    | `unknown[]` | —              | Modificadores disponíveis     |
| `timestamp`    | `Date`      | `timestamp`    | Data/hora do cache            |

**TTL:** 24 horas (`MENU_CACHE_TTL_MS = 24 * 60 * 60 * 1000`)

**Código:**

```typescript
menu_cache: '++id, timestamp, restaurantId';
```

### Tabela `pending_sync`

Fila de pedidos pendentes de sincronização.

| Campo          | Tipo         | Índice      | Descrição                                         |
| -------------- | ------------ | ----------- | ------------------------------------------------- |
| `id`           | `number`     | `++id`      | Chave primária auto-increment                     |
| `restaurantId` | `string`     | —           | ID do restaurante                                 |
| `orderData`    | `unknown`    | —           | Dados completos do pedido                         |
| `retryCount`   | `number`     | —           | Contagem de tentativas                            |
| `maxRetries`   | `number`     | —           | Máximo de tentativas (3)                          |
| `status`       | `SyncStatus` | `status`    | `pending` \| `syncing` \| `failed` \| `completed` |
| `lastError`    | `string`     | —           | Última mensagem de erro                           |
| `createdAt`    | `Date`       | `createdAt` | Timestamp de criação                              |

**Código:**

```typescript
pending_sync: '++id, status, createdAt';
```

### Tabela `tables_info`

Informações das mesas (para operação offline).

| Campo          | Tipo     | Índice         | Descrição                     |
| -------------- | -------- | -------------- | ----------------------------- |
| `id`           | `number` | `++id`         | Chave primária auto-increment |
| `tableId`      | `string` | `tableId`      | ID da mesa                    |
| `restaurantId` | `string` | `restaurantId` | ID do restaurante             |
| `name`         | `string` | —              | Nome descritivo da mesa       |

**Código:**

```typescript
tables_info: '++id, tableId, restaurantId';
```

---

## 4. Service Worker (Workbox)

O Service Worker está em `apps/web/public/sw.js` e utiliza Workbox para estratégias de caching.

### Estratégias por Tipo de Recurso

#### Assets Estáticos (JS, CSS) — CacheFirst

```javascript
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new CacheFirst({
    cacheName: 'static-assets-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
        maxEntries: 100,
      }),
    ],
  })
);
```

#### Imagens — CacheFirst

```javascript
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
        maxEntries: 60,
      }),
    ],
  })
);
```

#### Google Fonts — CacheFirst

```javascript
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
        maxEntries: 30,
      }),
    ],
  })
);
```

#### API Menu/Produtos/Categorias — NetworkFirst

```javascript
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/menu') ||
    url.pathname.startsWith('/api/products') ||
    url.pathname.startsWith('/api/categories'),
  new NetworkFirst({
    cacheName: 'menu-api-cache',
    networkTimeoutSeconds: 3, // Timeout para fallback
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60, // 1 dia
        maxEntries: 50,
      }),
    ],
  })
);
```

#### API Geral (GET) — StaleWhileRevalidate

```javascript
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60,
        maxEntries: 100,
      }),
    ],
  }),
  'GET'
);
```

#### API Orders (POST) — NetworkFirst + BackgroundSync

```javascript
const bgSyncPlugin = new BackgroundSyncPlugin('orders-queue', {
  maxRetentionTime: 24 * 60, // 24 horas em minutos
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/orders'),
  new NetworkFirst({
    cacheName: 'orders-api-cache',
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] }), bgSyncPlugin],
  }),
  'POST'
);
```

### App Shell — NetworkFirst

```javascript
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 3,
  })
);
```

### Fallback Offline

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(() => {
      return caches.match('/offline.html').then((resp) => {
        return (
          resp ||
          new Response('<html><body><h1>Você está offline</h1>...</html>', {
            headers: { 'Content-Type': 'text/html' },
          })
        );
      });
    })
  );
});
```

---

## 5. Background Sync

O sistema de Background Sync garante que pedidos feitos offline sejam sincronizados quando a conexão retornar.

### Fluxo de Retry com Backoff Exponencial

```
Tentativa 1 ──► Falhou ──► Espera 1s  (1000ms)
                              │
                              ▼
Tentativa 2 ──► Falhou ──► Espera 2s  (2000ms)
                              │
                              ▼
Tentativa 3 ──► Falhou ──► Espera 4s  (4000ms)
                              │
                              ▼
                          MAX 30s
```

### Implementação (`apps/web/apps/web/src/lib/offline/sync.ts`)

```typescript
const INITIAL_BACKOFF_MS = 1000;
const MAX_RETRIES = 3;

function getBackoffDelay(retryCount: number): number {
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retryCount), 30000);
}
```

### Funções Principais

| Função                                       | Descrição                           |
| -------------------------------------------- | ----------------------------------- |
| `queueOrderForSync(orderData, restaurantId)` | Adiciona pedido à fila              |
| `processQueue()`                             | Processa todos os pedidos pendentes |
| `retryFailed()`                              | Reseta pedidos failed para pending  |
| `getSyncStatus()`                            | Retorna contagem por status         |
| `getPendingItems()`                          | Lista pedidos pendentes             |
| `getFailedItems()`                           | Lista pedidos com erro              |

### Status dos Pedidos

| Status      | Descrição                       |
| ----------- | ------------------------------- |
| `pending`   | Aguardando processamento        |
| `syncing`   | Em processamento                |
| `failed`    | Falhou após todas as tentativas |
| `completed` | Sincronizado com sucesso        |

---

## 6. Cross-Tab Sync (BroadcastChannel)

O `BroadcastChannel` mantém o carrinho sincronizado entre múltiplas abas do navegador.

### Canal

```typescript
const CART_CHANNEL_NAME = 'pedi-ai-cart';
```

### Estrutura da Mensagem

```typescript
interface CartBroadcast {
  type: 'CART_UPDATE';
  items: Array<{
    id: string;
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    modifiers: SelectedModifier[];
    notes?: string;
    comboId?: string;
    bundlePrice?: number;
    comboItems?: Array<{ productId: string; quantity: number }>;
    createdAt: Date;
  }>;
  timestamp: number;
}
```

### Prevenção de Echo

Para evitar que uma aba receba sua própria mensagem (eco), é usado timestamp:

```typescript
const handler = (event: MessageEvent<CartBroadcast>) => {
  if (event.data.type !== 'CART_UPDATE') return;
  // Ignora broadcasts de si mesmo
  if (event.data.timestamp <= lastBroadcastTimestamp) return;
  callback(event.data.items);
};
```

### Integração no cartStore

```typescript
// apps/web/src/infrastructure/persistence/cartStore.ts

useCartStore.subscribe(
  (state: CartStore) => state.items,
  (items: CartItem[]) => {
    persistCartToIndexedDB(items).catch(console.error);
    broadcastCartUpdate(items); // Envia para outras abas
  }
);

export function initCrossTabSync(): () => void {
  const cleanup = listenForCartUpdates((items) => {
    const currentItems = useCartStore.getState().items;
    if (JSON.stringify(currentItems) !== JSON.stringify(items)) {
      useCartStore.setState({ items });
    }
  });
  return cleanup;
}
```

---

## 7. TTL do Cache

| Tipo                      | TTL                | Limite Entradas |
| ------------------------- | ------------------ | --------------- |
| Assets estáticos (JS/CSS) | 30 dias            | 100             |
| Imagens                   | 30 dias            | 60              |
| Google Fonts              | 1 ano              | 30              |
| API Menu/Produtos         | 24 horas           | 50              |
| API Geral                 | 24 horas           | 100             |
| Cardápio (Dexie)          | 24 horas           | —               |
| BackgroundSync            | 24 horas (minutos) | —               |

### Validação de Cache no Dexie

```typescript
const MENU_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedMenu(restaurantId: string): Promise<CachedMenu | null> {
  const cached = await db.menu_cache.where('restaurantId').equals(restaurantId).toArray();
  if (!cached.length) return null;

  const entry = cached[0];
  const age = Date.now() - entry.timestamp.getTime();

  if (age > MENU_CACHE_TTL_MS) {
    await db.menu_cache.delete(entry.id!);
    return null;
  }

  return { ... };
}
```

---

## 8. Detecção de Conectividade

### Componente `OfflineIndicator`

O componente `OfflineIndicator` em `apps/web/src/components/providers/OfflineIndicator.tsx` detecta mudanças de conectividade:

```typescript
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
      processQueue(); // Sincroniza pedidos pendentes
    }

    function onOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
}
```

### Feedback Visual

| Estado          | Banner                                            |
| --------------- | ------------------------------------------------- |
| **Online**      | Nenhum (null)                                     |
| **Offline**     | Banner preto fixo no topo: "📵 Você está offline" |
| **Reconectado** | Toast verde por 3s: "✓ Conexão restaurada"        |

### Detecção no Checkout

```typescript
// apps/web/src/components/checkout/CheckoutForm.tsx

if (navigator.onLine === false) {
  setErrors((prev) => ({
    ...prev,
    offline: 'Você está offline. O pedido será enviado quando a conexão for restaurada.',
  }));
}
```

---

## 9. Fluxo de Sincronização de Pedido

### Passo a Passo: Pedido Feito Offline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE PEDIDO OFFLINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

 1. USUÁRIO FECHA PEDIDO
    │
    ▼
 2. validateCart() é chamado
    │
    ▼
 3. navigator.onLine === false?
    │
    ├─── SIM ─────────────────────────────────────────────────────────────┐
    │                                                                    │
    ▼                                                                    ▼
 4. Pedido salvo em IndexedDB                          5. Pedido enviado
    (pending_sync)                                       via API normal
    │
    │                                                                     │
    ▼                                                                     │
 6. Banner "Você está offline" aparece                                    │
                                                                            │
                                                                            │
    ┌───────────────────────────────────────────────────────────────────┘
    │
    ▼
 7. USUÁRIO RECONECTA
    │
    ▼
 8. Evento 'online' disparado
    │
    ▼
 9. OfflineIndicator.onOnline() é chamado
    │
    ▼
10. processQueue() é invocado
    │
    ▼
11. Para cada pedido em pending_sync:
    │
    ├── Status = 'syncing'
    │
    ├── Fetch POST /api/orders
    │
    ├── Sucesso?
    │   ├── SIM → pending_sync.delete() → success++
    │   │
    │   └── NÃO → getBackoffDelay() → retryCount++
    │                    │
    │                    ▼
    │            retryCount >= maxRetries?
    │            ├── SIM → status = 'failed'
    │            └── NÃO → status = 'pending'
    │
    ▼
12. Toast "Conexão restaurada" aparece por 3s
    │
    ▼
13. Tela de sucesso do pedido (via webhook Supabase)
```

### Código do Fluxo

```typescript
// apps/web/src/lib/offline/sync.ts - processQueue()

export async function processQueue(): Promise<{ success: number; failed: number }> {
  const pending = await db.pending_sync
    .where('status')
    .anyOf(['pending', 'failed'] as SyncStatus[])
    .toArray();

  for (const item of pending) {
    if (item.status === 'failed' && item.retryCount >= item.maxRetries) {
      continue; // Já tentou máximo, não tentar novamente
    }

    await db.pending_sync.update(item.id!, { status: 'syncing' });

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.orderData),
      });

      if (response.ok) {
        await db.pending_sync.delete(item.id!);
        success++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      const delay = getBackoffDelay(item.retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));

      const updated: Partial<PendingSync> = {
        retryCount: item.retryCount + 1,
        lastError: err instanceof Error ? err.message : String(err),
        status: item.retryCount + 1 >= item.maxRetries ? 'failed' : 'pending',
      };
      await db.pending_sync.update(item.id!, updated);
      failed++;
    }
  }

  return { success, failed };
}
```

---

## 10. Melhorias Recomendadas

### 10.1 Viewport Fit e Safe Areas (iOS)

Para melhor experiência em iPhones com notch, adicionar:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### 10.2 Cache da Página Offline

Implementar cache completo da página offline.html com todos os assets críticos:

```javascript
// Adicionar offline.html e seus assets ao precache
precacheAndRoute(self.__WB_MANIFEST);
// Garantir que offline.html seja cacheado
```

### 10.3 Indicador de Sync Status

Melhorar `SyncStatus.tsx` para mostrar:

- Número de pedidos na fila
- Indicador visual de progresso
- Botão para forçar sync manual

### 10.4 Estratégia de Cache para QR Codes

Adicionar caching específico para imagens de QR Code:

```javascript
registerRoute(
  ({ url }) => url.pathname.includes('/api/qr/'),
  new CacheFirst({
    cacheName: 'qr-codes-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
        maxEntries: 50,
      }),
    ],
  })
);
```

### 10.5 Sync de Preferências do Usuário

Sincronizar preferências offline entre abas e dispositivos:

- Forma de pagamento preferida
- Histórico de pedidos local
- Configurações de notificação

### 10.6 Monitoramento de conectividade mais robusto

Considerar usar a API Network Information:

```typescript
const connection = navigator.connection;
if (connection?.effectiveType === '2g') {
  // Usar estratégias mais agressivas de cache
}
```

---

## Referências

- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Dexie Documentation](https://dexie.org/docs/)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)
- [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
