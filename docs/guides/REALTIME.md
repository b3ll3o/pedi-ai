# Guia de Subscriptions Realtime — Pedi-AI

Este documento descreve a arquitetura de subscriptions realtime implementada no Pedi-AI, incluindo o fallback via polling e as melhores práticas para manter pedidos e itens sincronizados em tempo real.

---

## 1. Visão Geral

O Pedi-AI utiliza **Supabase Realtime** para receber atualizações instantâneas de pedidos sem necessidade de recarregar a página. Quando a conexão WebSocket não está disponível ou falha, o sistema utiliza um **polling fallback** com intervalo de 10 segundos para garantir que os dados permaneçam atualizados.

### Fluxo de Dados

```
┌─────────────┐     WebSocket      ┌──────────────┐
│  Admin UI   │ ◄──────────────►  │ Supabase     │
│             │                    │ Realtime     │
└─────────────┘                    └──────────────┘
       │                                 │
       │  (fallback)                      │
       ▼                                 ▼
┌─────────────┐                    ┌──────────────┐
│  API Route  │                    │  PostgreSQL  │
│  /api/admin │                    │  Database    │
└─────────────┘                    └──────────────┘
```

---

## 2. Arquitetura Realtime

### WebSocket e Phoenix Channels

O Supabase Realtime é construído sobre **Phoenix Channels** (Elixir/Erlang), que utiliza protocolo WebSocket para comunicação bidirecional em tempo real. Cada subscription cria um canal nomeado no servidor Realtime.

### Channel naming

```
supabase.channel('admin-orders-changes')
```

O canal é registrado no servidor Supabase e permanece ativo enquanto o componente estiver montado. Quando o componente é desmontado, o canal é removido automaticamente via `supabase.removeChannel(channel)`.

### Estados da Conexão

| Estado | Significado |
|--------|-------------|
| `SUBSCRIBED` | Conexão estabelecida com sucesso |
| `CHANNEL_ERROR` | Erro no canal — fallback dispara |
| `TIMED_OUT` | Timeout na conexão — fallback dispara |
| `CLOSED` | Conexão encerrada |

---

## 3. Canais de Subscription

O sistema.subscribe-se a duas tabelas do PostgreSQL via `postgres_changes`:

### 3.1 Canal de Pedidos (`orders`)

```typescript
supabase
  .channel('admin-orders-changes')
  .on(
    'postgres_changes',
    {
      event: '*',       // Todos os eventos (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'orders',
      filter: `restaurant_id=eq.${restaurantId}`, // Filtro por restaurante
    },
    (_payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] })
      setIsConnected(true)
    }
  )
```

**Filtro aplicado:** `restaurant_id=eq.{restaurantId}` — apenas pedidos do restaurante autenticado são recebidos.

### 3.2 Canal de Itens de Pedido (`order_items`)

```typescript
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'order_items',
  },
  (_payload) => {
    queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] })
  }
)
```

> **Nota:** Este canal **não possui filtro** por restaurant_id, pois a tabela `order_items` não possui essa coluna diretamente. A invalidação do cache de pedidos é suficiente para atualizar a UI, pois a query de pedidos inclui os itens relacionados.

---

## 4. Polling Fallback

Quando a conexão WebSocket falha ou não está disponível, o sistema ativa o polling como backup.

### Configuração

```typescript
const POLLING_INTERVAL = 10000 // 10 segundos
```

### Lógica de Ativação

```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setIsConnected(true)
    stopPolling()           // Para o polling quando WebSocket funciona
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    setIsConnected(false)
    startPolling()         // Inicia polling como fallback
  }
})
```

### Fluxo Completo

1. Componente monta → tenta conectar WebSocket
2. Se `SUBSCRIBED` → para polling, usa realtime
3. Se `CHANNEL_ERROR` ou `TIMED_OUT` → inicia polling a cada 10s
4. Se reconecta posteriormente → para polling novamente

---

## 5. Hook `useRealtimeOrders`

### Assinatura

```typescript
function useRealtimeOrders({
  restaurantId?,   // ID do restaurante para filtrar
  enabled?,        // Habilita/desabilita a subscription (default: true)
  pollingInterval? // Intervalo de polling em ms (default: 10000)
}): UseRealtimeOrdersResult
```

### Tipo de Retorno

```typescript
interface UseRealtimeOrdersResult {
  orders: OrderWithItems[]    // Lista de pedidos com itens
  isLoading: boolean          // Estado de carregamento inicial
  error: Error | null         // Erro, se houver
  isConnected: boolean        // true se WebSocket está ativo
  refetch: () => void         // Força refetch manual
}
```

### Estados da Connection

| Estado | Condição |
|--------|----------|
| `connecting` | Ao iniciar, antes do primeiro callback de status |
| `connected` | `status === 'SUBSCRIBED'` |
| `polling` | Fallback ativo, WebSocket indisponível |
| `error` | Erro ao buscar dados ou conexão falhou |

### Fluxo Interno

1. Query é executada via React Query (`useQuery`)
2. Effect configura subscription e polling
3. Mudanças no banco disparam `queryClient.invalidateQueries`
4. React Query refetch automaticamente
5. UI atualiza com novos dados

### Cleanup no Desmontagem

```typescript
return () => {
  stopPolling()
  supabase.removeChannel(channel)
}
```

Garante que:
- Intervalos são limpos
- Canal WebSocket é removido
- Não há memory leaks

---

## 6. Hook `useRealtimeConnection`

Este hook monitora a saúde da conexão com o Supabase medindo latência.

### Implementação

```typescript
function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)

  useEffect(() => {
    const measureLatency = async () => {
      const start = Date.now()
      try {
        await supabase.from('restaurants').select('id').limit(1)
        setLatency(Date.now() - start)
        setIsConnected(true)
      } catch {
        setIsConnected(false)
        setLatency(null)
      }
    }

    measureLatency()
    const pingIntervalRef = setInterval(measureLatency, 30000) // 30s

    return () => clearInterval(pingIntervalRef)
  }, [])

  return { isConnected, latency }
}
```

### Características

| Métrica | Valor |
|---------|-------|
| Intervalo de ping | 30.000 ms (30 segundos) |
| Query utilizada | `SELECT id FROM restaurants LIMIT 1` |
| Métrica coletada | Latência em milissegundos |

### Uso Recomendado

```typescript
const { isConnected, latency } = useRealtimeConnection()

// Exibir indicador de status na UI
{!isConnected && <Banner type="warning">Conexão lenta ou offline</Banner>}
{latency && <span>Latência: {latency}ms</span>}
```

---

## 7. Conexão e Desconexão

### Ciclo de Vida Completo

```
MOUNT                          UNMOUNT
  │                               │
  ▼                               │
┌──────────────────┐               │
│ createClient()   │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌──────────────────┐               │
│ channel()        │               │
│ .on(postgres_    │               │
│  changes)        │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌──────────────────┐               │
│ .subscribe()     │               │
│                  │               │
│ Se SUBSCRIBED:   │               │
│  - stopPolling() │               │
│  - setConnected  │               │
│ Se ERROR/TIMEOUT:│               │
│  - startPolling()│               │
└────────┬────────┘               │
         │                        │
         ▼                  ┌─────┴──────┐
    [ativa enquanto          │ removeChannel()
     componente existe]       │ stopPolling()
                              └────────────┘
```

### Boas Práticas de Cleanup

```typescript
useEffect(() => {
  const channel = supabase.channel('...')
  
  // Setup...
  
  return () => {
    // Cleanup em ordem reversa
    stopPolling()
    supabase.removeChannel(channel)
  }
}, [dependencies])
```

---

## 8. Eventos Rastreados

### Tabela `orders`

| Evento | Gatilho | Ação |
|--------|---------|------|
| `INSERT` | Novo pedido criado | Invalida cache, atualiza lista |
| `UPDATE` | Status alterado (pending→confirmed→preparing→ready) | Invalida cache, atualiza UI |
| `DELETE` | Pedido removido | Invalida cache, remove da lista |

### Tabela `order_items`

| Evento | Gatilho | Ação |
|--------|---------|------|
| `INSERT` | Item adicionado | Invalida cache do pedido |
| `UPDATE` | Quantidade alterada | Invalida cache do pedido |
| `DELETE` | Item removido | Invalida cache do pedido |

### Filtro por Restaurant

```typescript
filter: `restaurant_id=eq.${restaurantId}`
```

Este filtro é **essencial** para:
- Reduzir tráfego WebSocket
- Garantir isolamento entre restaurantes
- Evitar updates desnecessários

---

## 9. Melhorias Recomendadas

### 9.1 Filtrar Eventos Específicos

Atualmente o código usa `event: '*'` para todos os eventos. Para maior precisão:

```typescript
// ANTES (atual)
event: '*'

// DEPOIS (recomendado)
event: 'INSERT',  // Apenas novos pedidos
// OU combinar para status específicos
```

**Exemplo para apenas status:**
```typescript
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'orders',
  filter: `restaurant_id=eq.${restaurantId}`,
}, (payload) => {
  // Apenas quando status muda
  const newStatus = payload.new.status
  if (['pending', 'confirmed', 'preparing', 'ready'].includes(newStatus)) {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
  }
})
```

### 9.2 Tratar Status CLOSED

O callback `.subscribe()` não trata o status `CLOSED`. Adicionar:

```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setIsConnected(true)
    stopPolling()
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    setIsConnected(false)
    startPolling()
  } else if (status === 'CLOSED') {
    // Reconectar automaticamente após delay
    setIsConnected(false)
    setTimeout(() => {
      // Recriar canal
    }, 5000)
  }
})
```

### 9.3 Atualizações Otimistas

Para UX mais responsiva, implementar optimistic updates:

```typescript
const updateOrderStatus = async (orderId: string, status: string) => {
  // 1. Atualizar cache imediatamente
  queryClient.setQueryData(['admin-orders', restaurantId], (old) =>
    old.map(order =>
      order.id === orderId ? { ...order, status } : order
    )
  )

  // 2. Enviar para servidor
  try {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  } catch (error) {
    // 3. Reverter se falhar
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
  }
}
```

### 9.4 Presence Tracking

Para sistemas com múltiplos admins concurrently, considerar **Supabase Presence**:

```typescript
const channel = supabase.channel('admin-presence')

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState()
  // state = { userId: [{ presence_ref, online_at }] }
})

channel.track({
  user_id: currentUser.id,
  online_at: new Date().toISOString()
})

// Sair ao desmontar
channel.untrack()
```

---

## 10. Boas Práticas

### 10.1 Performance

| Prática | Impacto |
|---------|---------|
| Usar `staleTime: 5000` | Reduz refetches desnecessários |
| Filtrar por `restaurant_id` | Menos eventos na conexão |
| Limpar intervals/channels | Evita memory leaks |
| Usar `queryClient.invalidateQueries` | Coordena com React Query |

### 10.2 Error Handling

```typescript
// Sempre tratar erros na query
queryFn: async () => {
  const response = await fetch(`/api/admin/orders?${params}`)
  if (!response.ok) {
    throw new Error('Falha ao buscar pedidos')
  }
  return response.json()
}
```

### 10.3 Desabilitar Quando Não Necessário

```typescript
// Não subscribe se não há restaurantId
enabled: enabled && !!restaurantId

// Desabilitar em telas que não usam pedidos
const { isConnected } = useRealtimeOrders({ restaurantId, enabled: false })
```

### 10.4 Monitoramento

```typescript
// Verificar latência regularmente
const { latency } = useRealtimeConnection()

// Alertar se latência > 2s
if (latency && latency > 2000) {
  console.warn('Latência alta detectada:', latency)
}
```

### 10.5 Testes

```typescript
// Mock do Supabase para testes
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({ on: () => ({ subscribe: () => {} }) })  }),
    removeChannel: jest.fn()
  })
}))
```

---

## Referências

- [Supabase Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase JS Client — Channel](https://supabase.com/docs/reference/javascript/channel)
- [React Query — Invalidating Queries](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)
