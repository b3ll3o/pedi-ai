# Spec: Acompanhamento de Pedido — MVP Multica

## 1. Overview

**Bounded Context:** pedido
**Scope:** Página para cliente acompanhar status do pedido em tempo real
**Status:** draft

---

## 2. Definições

| Termo | Definição |
|-------|-----------|
| **Tracking** | Página para cliente acompanhar pedido |
| **Status** | Estado: `recebido` → `preparando` → `pronto` → `entregue` |

---

## 3. Funcionalidades

### 3.1 Exibição de Status

| Feature | Descrição |
|---------|-----------|
| Timeline visual | FSM com ícones por status |
| Status atual | Destacado e animado |
| Tempo | Quanto tempo no status atual |
| Histórico | Quando mudou de status |

### 3.2 Detalhes do Pedido

| Feature | Descrição |
|---------|-----------|
| Número do pedido | Código para identificação |
| Mesa | Identificação da mesa |
| Itens | Lista de itens pedidos |
| Total | Valor total |

### 3.3 Atualização em Tempo Real

| Feature | Descrição |
|---------|-----------|
| Realtime | Supabase Realtime subscription |
| Notificação | Som/toast quando pronto |

---

## 4. Layout

```
┌─────────────────────────────────────────────────┐
│  Pedido #1234                                   │
│  Mesa 5                                         │
├─────────────────────────────────────────────────┤
│                                                 │
│    ●────────●────────●────────○                  │
│  Recebido  Preparando  Pronto   Entregue        │
│                                                 │
│  Seu pedido está sendo preparado!               │
│  Há 5 minutos                                  │
│                                                 │
├─────────────────────────────────────────────────┤
│  ITENS                                          │
│  2x Burger        R$ 45,90                     │
│     P, Sem cebola                               │
│  1x Refri        R$ 7,90                       │
│                                                 │
│  TOTAL        R$ 53,80                         │
└─────────────────────────────────────────────────┘
```

---

## 5. API Endpoints

### GET /api/pedidos/[id]

**Response:**
```json
{
  "id": "uuid",
  "numero": 1234,
  "status": "preparando",
  "mesa": { "numero": "5" },
  "itens": [...],
  "total": 53.80,
  "historico": [
    { "status": "recebido", "timestamp": "..." },
    { "status": "preparando", "timestamp": "..." }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 6. Real-time

```typescript
supabase
  .channel(`pedido:${pedidoId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'pedidos',
    filter: `id=eq.${pedidoId}`
  }, (payload) => {
    if (payload.new.status === 'pronto') {
      playNotification();
    }
  })
  .subscribe();
```

---

## 7. Critérios de Aceitação

- [ ] Cliente vê timeline com status atual
- [ ] Status atualiza em tempo real
- [ ] Notificação (som/toast) quando pedido pronto
- [ ] Lista de itens visível
- [ ] Tempo no status atual exibido
- [ ] Funciona offline (último status conhecido)

---

## 8. Out of Scope

- Autenticação (cliente não precisa estar logado)
- Cancelamento pelo cliente
- Reembolso
