# Guia de Navegação Pública de Restaurantes — Pedi-AI

Este documento descreve a navegação pública de restaurantes (delivery) implementada no Pedi-AI, onde clientes podem visualizar cardápios e fazer pedidos sem autenticação.

---

## 1. Visão Geral

A navegação pública permite que clientes acessem restaurantes e façam pedidos sem precisar estar logados. O fluxo completo de delivery funciona através de:

- Listagem pública de restaurantes ativos
- Visualização de cardápio por restaurante
- Montagem de carrinho e checkout
- Pagamento via PIX

### Rotas Públicas

| Rota                          | Descrição                    | Autenticação  |
| ----------------------------- | ---------------------------- | ------------- |
| `/restaurantes`               | Lista de restaurantes ativos | Não requerida |
| `/restaurantes/[id]/cardapio` | Cardápio de um restaurante   | Não requerida |

---

## 2. Estrutura de Rotas

```
apps/web/src/app/
├── restaurantes/
│   ├── page.tsx                    # Lista pública de restaurantes
│   ├── RestaurantesPageClient.tsx  # Componente cliente
│   └── [restaurantId]/
│       └── cardapio/
│           ├── page.tsx           # Cardápio do restaurante
│           └── loading.tsx        # Loading state
```

---

## 3. API Routes

### 3.1 GET /api/restaurants

Lista restaurantes ativos para a página pública.

**Filtros:**

- `ativo: true` — apenas restaurantes ativos
- Seleciona: `id`, `nome`, `logo_url`, `endereco`, `telefone`, `horarios`

**Response:**

```json
{
  "restaurants": [
    {
      "id": "rest_xxx",
      "nome": "Restaurante Exemplo",
      "logoUrl": "https://...",
      "endereco": "Rua Exemplo, 123",
      "telefone": "(11) 99999-9999",
      "horarios": {
        "seg": "09:00-22:00",
        "ter": "09:00-22:00"
      }
    }
  ]
}
```

### 3.2 GET /api/restaurants/[id]

Retorna detalhes públicos de um restaurante.

---

## 4. Fluxo de Dados (Delivery)

```
┌─────────────────┐
│   /restaurantes │
│  Lista pública  │
└────────┬────────┘
         │ click em restaurante
         ▼
┌─────────────────────────────────┐
│ /restaurantes/<id>/cardapio     │
│ restaurantId = params.id        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ useCardapio(restaurantId)       │
│ useMenuStore.restaurantId       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Carrinho → Checkout → Pedido    │
│ Isolado por restaurantId        │
└─────────────────────────────────┘
```

---

## 5. Isolamento por Restaurante

### 5.1 Store de Cardápio

O `useMenuStore` armazena o `restaurantId` atual:

```typescript
interface MenuStore {
  restaurantId: string | null;
  setRestaurantId: (id: string) => void;
}
```

### 5.2 Store de Carrinho

O carrinho é isolado por restaurante para evitar misturar itens:

```typescript
interface CartStore {
  restaurantId: string | null;
  items: CartItem[];

  // Limpa carrinho ao trocar de restaurante
  setRestaurantId: (id: string) => void;
  clearCart: () => void;
}
```

### 5.3 Bloqueio de Checkout

Ao tentar adicionar item de restaurante diferente do carrinho atual:

1. Exibir confirmação ao usuário
2. Limpar carrinho antes de adicionar novo item
3. Ou bloquear e pedir confirmação

---

## 6. Autenticação

### 6.1 Rotas Públicas

As seguintes rotas **não requerem** autenticação:

- `/restaurantes`
- `/restaurantes/[id]/cardapio`
- `/checkout` (para pedidos sem login)

### 6.2 Rotas Protegidas

As seguintes rotas **requerem** autenticação:

- `/admin/*` — painel administrativo
- `/dashboard/*` — área do proprietário/funcionário
- `/register` — registro de novos usuários

### 6.3 checkout

O checkout pode ser feito sem login (cliente anônimo). Dados do cliente são coletados durante o checkout:

```typescript
interface CheckoutData {
  nome: string;
  telefone: string;
  observacoes?: string;
}
```

---

## 7. Proposal

O design e proposta original estão documentados em:

o spec original do sistema de navegação

---

## 8. Estrutura de Arquivos

```
apps/web/src/
├── app/
│   ├── restaurantes/
│   │   ├── page.tsx                    # Página de listagem
│   │   ├── RestaurantesPageClient.tsx  # Componente cliente
│   │   └── [restaurantId]/
│   │       └── cardapio/
│   │           ├── page.tsx           # Página de cardápio
│   │           └── loading.tsx       # Loading state
│   │
│   └── api/restaurants/
│       ├── route.ts                   # GET /api/restaurants
│       └── [id]/route.ts             # GET /api/restaurants/[id]
│
├── components/
│   └── restaurant/
│       ├── RestaurantList.tsx        # Grid de restaurantes
│       ├── RestaurantCard.tsx       # Card individual
│       └── RestaurantSearch.tsx      # Busca por nome
│
├── stores/
│   ├── menuStore.ts                  # Armazena restaurantId atual
│   └── cartStore.ts                  # Carrinho isolado por restaurante
│
└── hooks/
    └── useCardapio.ts                # Hook de cardápio com restaurantId
```

---

## 9. Diferença entre Delivery e Mesa/Salão

| Aspecto              | Delivery                      | Mesa/Salão        |
| -------------------- | ----------------------------- | ----------------- |
| **Rota**             | `/restaurantes/[id]/cardapio` | `/table/[code]`   |
| **Autenticação**     | Não requerida                 | Não requerida     |
| **Identificação**    | `restaurantId` da URL         | QR Code na mesa   |
| **Cliente**          | Anônimo ou logado             | Anônimo ou logado |
| **Status do pedido** | Igual                         | Igual             |

> **Nota:** O sistema de mesa/salão (QR code na mesa) será implementado futuramente.

---

## 10. Testes

### 10.1 Fluxos E2E

```bash
# Fluxo de delivery público
npx playwright test tests/e2e/tests/delivery/
```

### 10.2 Cenários de Teste

| Cenário                    | Comportamento Esperado                   |
| -------------------------- | ---------------------------------------- |
| Acessar `/restaurantes`    | Lista restaurantes ativos carrega        |
| Clicar em restaurante      | Navega para cardápio correto             |
| Adicionar item ao carrinho | Item adicionado com restaurantId correto |
| Trocar de restaurante      | Carrinho limpo ou confirmação exibida    |
| Checkout sem login         | Pedido criado com dados do cliente       |
