# Guia de Realtime — Pedi-AI

> **Status**: Socket.io integrado com polling fallback.

O Pedi-AI utiliza **Socket.io** para receber atualizações de pedidos em tempo real via WebSocket, com polling REST como fallback quando a conexão WebSocket não está disponível.

---

## 1. Arquitetura

### Stack
- **Server**: `@nestjs/websockets` + `socket.io` (v4.8.3)
- **Client**: `socket.io-client` (v4.x)

### Diagrama

```
┌─────────────┐    WebSocket    ┌──────────────────┐
│  Frontend   │◄──────────────►│ RealtimeGateway  │
│  (socket.io │    socket.io    │  (NestJS)        │
│   client)   │                │                  │
└─────────────┘                └────────┬─────────┘
                                         │
                                         ▼
                               ┌──────────────────┐
                               │  OrdersService   │
                               │  (emite eventos) │
                               └────────┬─────────┘
                                         │
                                         ▼
                               ┌──────────────────┐
                               │   PostgreSQL     │
                               │   (Prisma)      │
                               └──────────────────┘
```

### Eventos

| Evento | Direção | Payload |
|--------|---------|---------|
| `joinRestaurant` | client→server | `{ restaurantId }` |
| `leaveRestaurant` | client→server | `{ restaurantId }` |
| `orderUpdate` | server→client | `{ id, status }` |
| `newOrder` | server→client | `{ id, total }` |

### Rooms

Cada restaurante tem uma room `restaurant:{id}` — todos os clientes conectados a essa room recebem eventos de atualizações de pedidos.

---

## 2. Hooks de Realtime

| Hook | Arquivo | Uso |
|------|---------|-----|
| `useSocketIO` | `apps/web/src/hooks/useSocketIO.ts` | Abstração de conexão Socket.io |
| `useRealtimeOrders` | `apps/web/src/hooks/useRealtimeOrders.ts` | Lista de pedidos no admin |
| `usePedidosKDS` | `apps/web/src/hooks/usePedidosKDS.ts` | Kitchen Display System |
| `useCustomerOrderNotifications` | `apps/web/src/hooks/useCustomerOrderNotifications.ts` | Acompanhamento de pedido pelo cliente |

---

## 3. Hook `useSocketIO`

Hook abstrato que gerencia a conexão Socket.io com reconnection automática e fallback para polling.

### Interface

```typescript
interface UseSocketIOOptions {
  restaurantId?: string;
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseSocketIOResult {
  isConnected: boolean;
  isReconnecting: boolean;
  joinRestaurant: (id: string) => void;
  leaveRestaurant: (id: string) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  disconnect: () => void;
}
```

### Uso

```typescript
const { isConnected, joinRestaurant, on, off } = useSocketIO({
  restaurantId: 'restaurant-uuid',
  enabled: true,
});
```

---

## 4. Hook `useRealtimeOrders`

Lista de pedidos no painel admin com atualização em tempo real.

### Uso

```typescript
const { orders, isConnected, refetch } = useRealtimeOrders({
  restaurantId: 'restaurant-uuid',
  enabled: true,
});
```

### Comportamento

- Socket.io: escuta `orderUpdate` e `newOrder` → invalida queries
- Polling fallback: 10s se socket desconectar

---

## 5. Hook `usePedidosKDS`

Kitchen Display System com som de notificação para novos pedidos.

### Uso

```typescript
const {
  pedidos,
  pedidosRecebidos,
  pedidosPreparando,
  pedidosProntos,
  atualizarStatusPedido,
} = usePedidosKDS({
  restauranteId: 'restaurant-uuid',
  staleThresholdSeconds: 300,
  somAtivado: true,
});
```

### Comportamento

- Socket.io: `newOrder` → toca som e invalida queries
- Polling fallback: 5s se socket desconectar

---

## 6. Hook `useCustomerOrderNotifications`

Monitora atualizações de status de pedidos específicos.

### Uso

```typescript
const { pendingUpdates, clearPendingUpdates } = useCustomerOrderNotifications({
  orderIds: ['order-1', 'order-2'],
  restaurantId: 'restaurant-uuid',
  onOrderUpdated: (payload) => {
    showToast(`Pedido ${payload.order_id}: ${getStatusLabel(payload.status)}`);
  },
});
```

---

## 7. Backend — RealtimeGateway

### `apps/api/src/realtime/realtime.gateway.ts`

```typescript
@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {}

  @SubscribeMessage('joinRestaurant')
  handleJoinRestaurant(@MessageBody() restaurantId: string, @ConnectedSocket() client: Socket) {
    client.join(`restaurant:${restaurantId}`);
  }

  emitOrderUpdate(restaurantId: string, order: { id: string; status: string }) {
    this.server?.to(`restaurant:${restaurantId}`).emit('orderUpdate', order);
  }

  emitNewOrder(restaurantId: string, order: { id: string; total: number }) {
    this.server?.to(`restaurant:${restaurantId}`).emit('newOrder', order);
  }
}
```

### `apps/api/src/realtime/realtime.service.ts`

```typescript
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitOrderUpdate(restaurantId: string, order: { id: string; status: string }) {
    this.gateway.emitOrderUpdate(restaurantId, order);
  }

  emitNewOrder(restaurantId: string, order: { id: string; total: number }) {
    this.gateway.emitNewOrder(restaurantId, order);
  }
}
```

### Integração com OrdersService

O `OrdersService` injeta `RealtimeService` e emite eventos após criar/atualizar pedidos:

```typescript
// Após criar pedido
this.realtimeService.emitNewOrder(data.restaurantId, { id: order.id, total: order.total });

// Após atualizar status
this.realtimeService.emitOrderUpdate(order.restaurantId, { id: order.id, status: order.status });
```

---

## 8. Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NEXT_PUBLIC_API_URL` | URL da API para conexão Socket.io | `http://localhost:3001` |

---

## 9. Boas Práticas

### Performance

| Prática | Impacto |
|---------|--------|
| `staleTime: 5000` | Reduz refetches desnecessários |
| Invalidação seletiva | Minimiza re-renders |
| Polling como fallback | Garante reliability |

### Reconexão

- Reconexão automática com backoff exponencial
- Máximo 5 tentativas
- Fallback para polling durante desconexão

---

## 10. Referências

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/adapters)
- [socket.io-client](https://socket.io/docs/v4/client-api/)
- `apps/api/src/realtime/realtime.gateway.ts`
- `apps/api/src/realtime/realtime.service.ts`
- `apps/web/src/hooks/useSocketIO.ts`
- `apps/web/src/hooks/useRealtimeOrders.ts`
- `apps/web/src/hooks/usePedidosKDS.ts`
- `apps/web/src/hooks/useCustomerOrderNotifications.ts`
