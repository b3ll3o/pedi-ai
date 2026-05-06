# Design: Navegação Pública de Restaurantes (Delivery)

## Technical Approach

Esta mudança implementa a navegação pública de restaurantes para **delivery** com as seguintes mudanças:

1. **Novas rotas públicas** para listagem e acesso a cardápios
2. **API pública** para listar restaurantes ativos
3. **Isolamento de carrinho** por restaurante
4. **Remoção do `DEMO_RESTAURANT_ID` hardcoded**

> **Nota:** A funcionalidade de **mesa/salão** (QR Code, identificação de mesa) será implementada futuramente, após o launch do delivery.

---

## Architecture Decisions

### Decision: URL Structure for Restaurant Menu
**Choice:** `/restaurantes/{restaurantId}/cardapio?mesa={tableId}`
**Alternatives considered:**
- `/menu/{restaurantId}` - conflita com rota existente de categoria
- `/r/{restaurantId}` - menos descritivo
- `/restaurant/{restaurantId}/menu` - mais longo
**Rationale:** Estrutura hierárquica clara que indica tratar-se de restaurantes, e dentro dele o cardápio. Parâmetro `mesa` como query string permite acessar sem mesa (retirada/delivery).

### Decision: Cart Isolation Strategy
**Choice:** Carrinho isolado por restauranteId no estado e IndexedDB
**Alternatives considered:**
- Compartilhar carrinho entre restaurantes - causaria confusão
- Não permitir trocar de restaurante com itens no carrinho - experiência ruim
**Rationale:** Limpar carrinho ao trocar de restaurante é mais simples e evita erros. Usuário pode confirmar se quiser manter.

### Decision: Restaurant API vs Admin API
**Choice:** Criar nova API pública `/api/restaurants` separada da admin
**Alternatives considered:**
- Reutilizar API admin com bypass de auth - segurança risco
- API admin com parâmetro público - mistura responsabilidades
**Rationale:** API pública para listar restaurantes ativos não requer autenticação e retorna apenas dados públicos (nome, logo, endereço, horários).

### Decision: URL Structure for Restaurant Menu
**Choice:** `/restaurantes/{restaurantId}/cardapio`
**Alternatives considered:**
- `/menu/{restaurantId}` - conflita com rota existente de categoria
- `/r/{restaurantId}` - menos descritivo
**Rationale:** Estrutura hierárquica clara que indica tratar-se de restaurantes, e dentro dele o cardápio. Sem parâmetro de mesa pois isso é para delivery (salão vem depois).

---

## Data Flow

### Fluxo 1: Listagem de Restaurantes

```
GET /restaurantes
        │
        ▼
┌───────────────────┐
│  page.tsx         │
│ (Server Component) │
└────────┬──────────┘
         │ fetch('/api/restaurants')
         ▼
┌───────────────────┐
│  /api/restaurants │
│  (GET - público)   │
└────────┬──────────┘
         │ SELECT id, name, logo_url, address, phone, horarios
         │ FROM restaurants WHERE ativo = true
         ▼
┌───────────────────┐
│   Supabase DB     │
└───────────────────┘
```

### Fluxo 2: Acesso ao Cardápio

```
Cliente clica em restaurante
     │
     ▼
/restaurantes/{restaurantId}/cardapio
     │
     ▼
┌─────────────────────────────────────────┐
│ page.tsx (Server Component)              │
│ - Extrai restaurantId da URL             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ MenuPageClient                           │
│ - Recebe restaurantId via useParams()    │
│ - Chama useCardapio(restaurantId)        │
│ - Carrega cardápio do restaurante        │
└─────────────────────────────────────────┘
```

### Fluxo 3: Isolamento de Carrinho

```
Cliente adiciona item
        │
        ▼
┌─────────────────────────────┐
│ cartStore.addItem(item)      │
│ - Associa restaurantId atual │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ IndexedDB (carrinho)        │
│ - Salva com restaurantId    │
└─────────────────────────────┘

Cliente troca de restaurante
        │
        ▼
┌─────────────────────────────┐
│ useEffect em page.tsx       │
│ - Detecta mudança de        │
│   restaurantId              │
│ - cartStore.clearCart()    │
└─────────────────────────────┘
```

---

## File Changes

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/app/restaurantes/page.tsx` | Página de listagem pública de restaurantes |
| `src/app/restaurantes/[restaurantId]/cardapio/page.tsx` | Página de cardápio do restaurante |
| `src/app/restaurantes/[restaurantId]/cardapio/loading.tsx` | Loading skeleton |
| `src/app/api/restaurants/route.ts` | API pública para listar restaurantes |
| `src/app/api/restaurants/[id]/route.ts` | API pública para detalhes do restaurante |
| `src/components/restaurant/RestaurantList.tsx` | Componente de lista de restaurantes |
| `src/components/restaurant/RestaurantCard.tsx` | Card individual de restaurante |
| `src/components/restaurant/RestaurantSearch.tsx` | Busca por nome |

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/app/(customer)/menu/MenuPageClient.tsx` | Remover DEMO_RESTAURANT_ID, receber restaurantId via props |
| `src/app/(customer)/menu/page.tsx` | Repassar restaurantId da URL para MenuPageClient |
| `src/stores/cartStore.ts` | Adicionar restaurantId ao estado do carrinho |
| `src/stores/menuStore.ts` | Adicionar restaurantId ao estado |

---

## Interfaces / Contratos

### API: GET /api/restaurants

```typescript
// Request: GET /api/restaurants
// Response 200:
{
  "restaurants": [
    {
      "id": "uuid",
      "name": "Restaurante Exemplo",
      "logo_url": "https://...",
      "address": "Rua tal, 123",
      "phone": "(11) 99999-9999",
      "horarios": "Seg-Sáb: 11h-22h"
    }
  ]
}
```

### API: GET /api/restaurants/[id]

```typescript
// Request: GET /api/restaurants/{id}
// Response 200:
{
  "restaurant": {
    "id": "uuid",
    "name": "Restaurante Exemplo",
    "description": "Descrição do restaurante",
    "logo_url": "https://...",
    "address": "Rua tal, 123",
    "phone": "(11) 99999-9999",
    "horarios": "Seg-Sáb: 11h-22h"
  }
}
// Response 404:
{ "error": "Restaurante não encontrado" }
```

### Store: CartState (modificado)

```typescript
interface CartState {
  items: CartItem[];
  restaurantId: string | null;  // NOVO: restaurante atual do carrinho
  isOpen: boolean;
}
```

### Store: MenuState (modificado)

```typescript
interface MenuState {
  restaurantId: string | null;  // NOVO: restaurante atual do cardápio
  categories: categories[];
  products: products[];
  // ...restante existente
}
```

---

## Testing Strategy

### Testes Unitários
- `RestaurantList` renderiza lista corretamente
- `RestaurantCard` exibe dados do restaurante
- `cartStore` isola carrinho por restaurantId
- `menuStore` reseta ao trocar de restaurante

### Testes de Integração
- API `/api/restaurants` retorna apenas restaurantes ativos
- API `/api/restaurants/[id]` retorna 404 para ID inválido
- Fluxo completo: listagem → click → cardápio carrega

### Testes E2E
- Cenário: Cliente acessa `/restaurantes`, clica em restaurante, faz pedido
- Cenário: QR code leva para cardápio correto com mesa
- Cenário: Carrinho é limpo ao trocar de restaurante

---

## Migration / Rollout

### Fase 1: Nova API e Components
1. Criar `/api/restaurants` pública
2. Criar componentes `RestaurantList`, `RestaurantCard`, `RestaurantSearch`
3. Criar página `/restaurantes`
4. Criar página `/restaurantes/[restaurantId]/cardapio`

### Fase 2: Atualização do Fluxo Existente
5. Atualizar `MenuPageClient` para receber `restaurantId`
6. Adicionar `restaurantId` ao `menuStore`
7. Adicionar isolamento de carrinho por restaurante
8. Remover `DEMO_RESTAURANT_ID` do código

### Rollback
- Feature flag `NEXT_PUBLIC_ENABLE_NEW_RESTAURANT_ROUTES=false` mantêm comportamento antigo

---

## Future: Salão/Mesa (Após Delivery)

Quando o feature de salão for implementado:
1. QR Code generator → novo formato de URL
2. `/table/[code]` → validação e redirect
3. `tableStore` → já existe, só precisa ser populado via QR scan

---

## Open Questions

1. **Horário de funcionamento:** Como exibir quando restaurante está fechado?
2. **Busca por localização:** Geolocalização será implementada no futuro?
3. **Cache de restaurante:** Devemos cachear listagem em IndexedDB também?
4. **Taxa de entrega:** Será por restaurante ou por distância?