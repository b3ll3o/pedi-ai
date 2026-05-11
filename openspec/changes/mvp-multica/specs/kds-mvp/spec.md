# Spec: KDS (Kitchen Display System) — MVP Multica

## 1. Overview

**Bounded Context:** pedido
**Scope:** Exibir pedidos em tempo real na cozinha e permitir atualização de status
**Status:** draft

---

## 2. Definições

| Termo | Definição |
|-------|-----------|
| **KDS** | Kitchen Display System — tela na cozinha para visualizar pedidos |
| **Pedido** | Aggregate que representa pedido do cliente |
| **Status** | Estado do pedido: `recebido` → `preparando` → `pronto` → `entregue` |

---

## 3. Funcionalidades

### 3.1 Exibição de Pedidos

| Feature | Descrição |
|---------|-----------|
| Lista de pedidos | Mostrar todos os pedidos ativos |
| Filtro por status | Filtrar por `recebido`, `preparando`, `pronto` |
| Ordenação | Mais antigo primeiro (FIFO) |
| Tempo desde criação | Mostrar quanto tempo passou desde `createdAt` |

### 3.2 Atualização de Status

| Ação | Novo Status | Requisito |
|------|-------------|-----------|
| Clicar "Preparando" | `preparando` | Status atual = `recebido` |
| Clicar "Pronto" | `pronto` | Status atual = `preparando` |
| Clicar "Entregue" | `entregue` | Status atual = `pronto` |
| Clicar "Cancelar" | `cancelado` | Qualquer status exceto `entregue` |

### 3.3 Notificações

| Evento | Notificação |
|--------|-------------|
| Novo pedido (`recebido`) | Som/visual alert |
| Status alterado | Atualização em tempo real |

---

## 4. Layout

```
┌─────────────────────────────────────────────────────────────┐
│  KDS — Cozinha                              [Filtros ▼]    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ RECEBIDO    │  │ PREPARANDO  │  │ PRONTO      │          │
│  │ #1234       │  │ #1233       │  │ #1232       │          │
│  │ Mesa 5      │  │ Mesa 3      │  │ Mesa 1      │          │
│  │ 2x Burger   │  │ 1x Pizza    │  │ 3x Salada   │          │
│  │ 1x Refri    │  │             │  │              │          │
│  │ 5 min       │  │ 12 min      │  │ 3 min       │          │
│  │             │  │             │  │              │          │
│  │ [PREPARAR]  │  │ [PRONTO]    │  │ [ENTREGUE]  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. API Endpoints

### GET /api/pedidos

**Query params:** `?status=recebido,preparando`

**Response:**
```json
{
  "pedidos": [
    {
      "id": "uuid",
      "numero": 1234,
      "status": "recebido",
      "mesaId": "uuid",
      "mesaLabel": "Mesa 5",
      "itens": [
        {
          "id": "uuid",
          "produtoNome": "Burger",
          "quantidade": 2,
          "modificadores": ["P", "Sem cebola"]
        }
      ],
      "observacao": "sem cebola",
      "createdAt": "2026-05-11T12:00:00Z"
    }
  ]
}
```

### PATCH /api/pedidos/[id]/status

**Request:**
```json
{
  "status": "preparando"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "preparando",
  "updatedAt": "2026-05-11T12:05:00Z"
}
```

---

## 6. Real-time

Usar Supabase Realtime para:
- Subscribe a mudanças em `pedidos`
- Atualizar KDS instantaneamente quando status mudar
- Notificar quando novo pedido chegar

---

## 7. Critérios de Aceitação

- [ ] KDS exibe pedidos em tempo real
- [ ] Pedidos ordenados por `createdAt` (mais antigo primeiro)
- [ ] Tempo desde criação visível em cada card
- [ ] Botões atualizam status corretamente
- [ ] Som/visual alert ao receber novo pedido
- [ ] Filtros por status funcionam
- [ ] Animação de novo pedido (highlight)

---

## 8. Out of Scope

- Impressão de comando
- Edição de itens do pedido
- Multi-cozinha (várias telas)
- Histórico de pedidos

---

## 9. Notas

- KDS atual em `/kitchen` pode servir como base
- Precisamos adaptar para o fluxo MVP (sem pagamento)
- Supabase Realtime já está configurado no projeto
