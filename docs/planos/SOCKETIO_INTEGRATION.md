# Plano: Integração Socket.io para Realtime

> **Data**: 2026-05-19
> **Status**: ✅ Completo
> **Responsável**: Implementação

---

## 1. Resumo

Integrar o gateway Socket.io existente no backend (`apps/api/src/realtime/realtime.gateway.ts`) com os hooks do frontend para substituir polling por WebSocket em tempo real.

---

## 2. Estado Atual

| Componente | Status | Observação |
|------------|--------|-------------|
| `RealtimeGateway` (API) | ✅ Existe | Não emite eventos ainda |
| `socket.io` (API) | ✅ v4.8.3 | Instalado |
| `socket.io-client` (Web) | ❌ Não instalado | Precisa adicionar |
| `useRealtimeOrders` | ⚠️ Polling | 10s interval |
| `usePedidosKDS` | ⚠️ Polling | 5s interval |
| `useCustomerOrderNotifications` | ⚠️ Polling | 5s interval |

---

## 3. Arquitetura

### Stack
- **Server**: `@nestjs/websockets` + `socket.io` (já instalado)
- **Client**: `socket.io-client` v4.x (a instalar)

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

---

## 4. Decisões de Arquitetura

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| Fallback | Manter polling | Garante reliability em conexões instáveis |
| Abstração | Hook `useSocketIO` | Reutilizável; separação de responsabilidades |
| Auth | JWT via handshake | Compatível com auth existente |
| Rooms | `restaurant:{id}` | Simples e escalável |

---

## 5. Fases de Implementação

### Fase 1: Infraestrutura

- [ ] 1.1 Instalar `socket.io-client` no web
  ```bash
  pnpm add socket.io-client -F @pedi-ai/web
  ```

- [ ] 1.2 Criar `apps/web/src/lib/socketio.ts`
  - Configuração do client Socket.io
  - URL do servidor (env var)

- [ ] 1.3 Criar `apps/web/src/hooks/useSocketIO.ts`
  - Hook abstrato de conexão
  - Métodos: `joinRestaurant`, `leaveRestaurant`, `on`, `off`
  - Estado: `isConnected`

### Fase 2: Backend

- [ ] 2.1 Modificar `apps/api/src/realtime/realtime.gateway.ts`
  - Adicionar `onModuleInit` para salvar server instance
  - Exportar server para uso em services

- [ ] 2.2 Criar `apps/api/src/realtime/realtime.service.ts`
  - Injectable que gerencia emissão de eventos
  - Métodos: `emitOrderUpdate`, `emitNewOrder`

- [ ] 2.3 Modificar `apps/api/src/orders/orders.service.ts`
  - Injetar `RealtimeService`
  - Chamar `emitNewOrder` após criar pedido
  - Chamar `emitOrderUpdate` após atualizar status

- [ ] 2.4 Exportar `RealtimeModule` corretamente

### Fase 3: Hook Integration

- [ ] 3.1 Modificar `apps/web/src/hooks/useRealtimeOrders.ts`
  - Usar `useSocketIO` para receber eventos
  - Invalidar queries ao receber `orderUpdate`
  - Manter polling como fallback

- [ ] 3.2 Modificar `apps/web/src/hooks/usePedidosKDS.ts`
  - Usar `useSocketIO` para receber `newOrder`
  - Tocar som ao receber novo pedido via socket
  - Manter polling como fallback

- [ ] 3.3 Modificar `apps/web/src/hooks/useCustomerOrderNotifications.ts`
  - Usar `useSocketIO` para monitorar status
  - Notificar callback ao receber `orderUpdate`

### Fase 4: Polish

- [ ] 4.1 Adicionar reconnect logic
  - Tentativas de reconnect automático
  - Backoff exponencial

- [ ] 4.2 Adicionar polling fallback
  - Se socket desconectar, ativar polling
  - Quando socket reconectar, desativar polling

- [ ] 4.3 Atualizar `docs/guides/REALTIME.md`
  - Documentar nova implementação Socket.io
  - Remover status "deprecated"

---

## 6. Arquivos a Alterar

### API (`apps/api/src`)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `realtime/realtime.gateway.ts` | Modificar | Salvar server instance |
| `realtime/realtime.service.ts` | Criar | Service para emitir eventos |
| `realtime/realtime.module.ts` | Modificar | Exportar service |
| `orders/orders.service.ts` | Modificar | Injetar RealtimeService |
| `app.module.ts` | - | Já importa RealtimeModule |

### Web (`apps/web/src`)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Modificar | Adicionar socket.io-client |
| `lib/socketio.ts` | Criar | Configuração do client |
| `hooks/useSocketIO.ts` | Criar | Hook abstrato de conexão |
| `hooks/useRealtimeOrders.ts` | Modificar | Usar socket |
| `hooks/usePedidosKDS.ts` | Modificar | Usar socket |
| `hooks/useCustomerOrderNotifications.ts` | Modificar | Usar socket |

### Docs

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `docs/guides/REALTIME.md` | Modificar | Documentar Socket.io |

---

## 7. Interface `useSocketIO`

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

---

## 8. Eventos do Gateway

```typescript
// Server → Client Events

interface OrderUpdatePayload {
  id: string;
  status: 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
}

interface NewOrderPayload {
  id: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
}
```

---

## 9. Estratégia de Testes

### Unit Tests
- Mock `socket.io-client` em testes de `useSocketIO`
- Mock `useSocketIO` em testes de `useRealtimeOrders`

### Integração
- Testar conexão real com API
- Testar reconnect behavior
- Testar eventos sendo emitidos corretamente

### E2E (já existente)
- Fluxo de pedido: admin vê atualização em tempo real
- KDS: novo pedido aparece com som
- Cliente: status atualiza sem refresh

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Socket.io não conecta em produção | Baixa | Alta | Polling fallback automático |
| Eventos perdidos durante reconnect | Média | Média | Invalidar queries ao reconectar |
| JWT token expira durante sessão | Baixa | Média | Refresh token no reconnect |
| Múltiplas conexões simultâneas | Baixa | Baixa | Limpar conexões no unmount |

---

## 11. Estimativa de Esforço

| Fase | Estimativa |
|------|------------|
| Fase 1: Infraestrutura | 2 horas |
| Fase 2: Backend | 3 horas |
| Fase 3: Hook Integration | 4 horas |
| Fase 4: Polish | 2 horas |
| **Total** | **11 horas** |

---

## 12. Pré-requisitos

1. API rodando em `http://localhost:3001`
2. PostgreSQL configurado
3. JWT_SECRET configurado
4. RealtimeModule importado no AppModule

---

## 13. Critérios de Aceitação

- [ ] Socket.io conecta e autentica corretamente
- [ ] Admin recebe `newOrder` em tempo real ao criar pedido
- [ ] Admin recebe `orderUpdate` ao atualizar status
- [ ] KDS toca som ao receber novo pedido via socket
- [ ] Cliente recebe atualização de status em tempo real
- [ ] Polling ativa como fallback quando socket desconecta
- [ ] Reconexão automática funciona após perda de conexão
- [ ] Queries são invalidadas corretamente ao receber eventos
- [ ] Sem memory leaks (cleanup no unmount)
- [ ] Testes passando

---

## 14. Referências

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/adapters)
- [socket.io-client](https://socket.io/docs/v4/client-api/)
- `apps/api/src/realtime/realtime.gateway.ts` (existente)
- `apps/web/src/hooks/useRealtimeOrders.ts` (existente)
