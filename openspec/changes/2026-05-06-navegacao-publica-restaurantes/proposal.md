# Proposal: Navegação Pública de Restaurantes (Delivery)

## Intent

Criar um fluxo de **navegação pública para delivery** onde clientes podem:
1. Acessar `/restaurantes` para ver todos os restaurantes disponíveis
2. Clicar em um restaurante e ir para `/restaurantes/<id>/cardapio`
3. Montar pedido no cardápio e finalizar (checkout → pagamento → confirmação)

O modelo multi-tenant já existe parcialmente no admin. Agora precisamos expor essa estrutura para o **cliente público**, permitindo que ele navegue entre restaurantes e faça pedidos de delivery.

**Problema:** Atualmente o cardápio usa `restaurantId` hardcoded e não existe página pública de listagem de restaurantes.

---

## Scope

### In Scope (Delivery - Fase 1)

1. **Nova rota `/restaurantes`**
   - Página pública listando todos os restaurantes ativos
   - Exibe: nome, endereço, logo, horário de funcionamento
   - Busca por nome (search)
   - Filtro por proximidade (futuro)

2. **Nova rota `/restaurantes/<id>/cardapio`**
   - Cardápio completo de um restaurante específico
   - Carrega dados do restaurante via `restaurantId`
   - Sem necessidade de login
   - Integra com fluxo de pedido existente (carrinho → checkout)

3. **Propagação do `restaurantId` no fluxo de pedido**
   - `useCardapio` recebe `restaurantId` via params da página
   - `menuStore` armazena `restaurantId` atual
   - Checkout e criação de pedido usam `restaurantId` correto

4. **API `/api/restaurants` (público)**
   - Lista restaurantes ativos para página pública
   - Retorna dados públicos (nome, logo, endereço, horários)

5. **Remoção do hardcoded `DEMO_RESTAURANT_ID`**
   - Substituir por `restaurantId` da URL

### Out of Scope

- **Atendimento presencial (mesa/salão)** — isso é para **futuro**, após delivery
- Autenticação de cliente (cliente faz pedido sem login)
- Área logada do cliente (histórico de pedidos)
- App mobile nativo
- Geolocalização para filtrar por proximidade (futuro)
- Avaliações e favoritos de restaurantes
- Integração com delivery (iFood, etc)
- QR Code para mesa (salão)

---

## Approach

### 1. Estrutura de Rotas

```
src/app/
├── restaurantes/
│   ├── page.tsx                    # Lista de restaurantes públicos (DELIVERY)
│   └── [restaurantId]/
│       └── cardapio/
│           ├── page.tsx           # Cardápio do restaurante
│           └── loading.tsx
```

> **Nota:** Rotas de mesa/salão (`/table/[code]`) serão implementadas futuramente.

### 2. Componentes a Criar

| Componente | Localização | Descrição |
|------------|-------------|-----------|
| `RestaurantList` | `src/components/restaurant/RestaurantList.tsx` | Grid de restaurantes |
| `RestaurantCard` | `src/components/restaurant/RestaurantCard.tsx` | Card individual |
| `RestaurantSearch` | `src/components/restaurant/RestaurantSearch.tsx` | Busca por nome |
| `MenuPage` | `src/app/restaurantes/[restaurantId]/cardapio/page.tsx` | Página de cardápio |
| `MenuPageClient` | Atualizar para receber `restaurantId` via params |

### 3. Stores a Atualizar

| Store | Mudança |
|-------|---------|
| `useMenuStore` | Armazenar `restaurantId` atual e carregar cardápio correto |
| `useCartStore` | Associar carrinho ao `restaurantId` para isolamento |

### 4. Fluxo de Dados (Delivery)

```
┌─────────────────┐
│ /restaurantes   │
│ Lista pública   │
└────────┬────────┘
         │ click
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

### 5. API Routes (Delivery)

**`/api/restaurants` (GET)**
```typescript
// Retorna lista pública de restaurantes
// Filtra: ativo = true
// Seleciona: id, nome, logo_url, endereco, telefone, horarios
```

**`/api/restaurants/[id]` (GET)**
```typescript
// Retorna detalhes públicos de um restaurante
```

---

## Affected Areas

| Área | Arquivos | Mudança |
|------|----------|---------|
| **Rotas** | `src/app/` | Novas páginas `/restaurantes/` |
| **Menu Store** | `src/stores/menuStore.ts` | Receber `restaurantId` por param |
| **Cart Store** | `src/stores/cartStore.ts` | Isolar carrinho por restaurante |
| **useCardapio** | `src/hooks/useCardapio.ts` | Receber `restaurantId` da página |
| **MenuPageClient** | `src/app/(customer)/menu/MenuPageClient.tsx` | Usar `restaurantId` da URL |
| **API restaurants** | `src/app/api/restaurants/` | Nova API pública |

---

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Carrinho de restaurante errado após troca | Média | Alto | Limpar carrinho ao trocar de restaurante; confirmar antes de adicionar itens |
| Performance na listagem com muitos restaurantes | Baixa | Baixo | Paginação na API; virtualização no frontend se > 50 items |

---

## Rollback Plan

1. **Feature Flag:** Adicionar `NEXT_PUBLIC_ENABLE_NEW_RESTAURANT_ROUTES=false`
   - Quando `false`: rotas antigas continuam funcionando
   - Quando `true`: novas rotas ativadas

2. **Git Tag:** Criar tag antes da mudança para rollback rápido

---

## Success Criteria

1. ✅ Usuário acessa `/restaurantes` e vê lista de restaurantes ativos
2. ✅ Usuário clica em restaurante e vai para `/restaurantes/<id>/cardapio`
3. ✅ Cardápio correto é carregado baseado no `restaurantId` da URL
4. ✅ Pedido é criado com `restaurantId` correto
5. ✅ Carrinho é isolado por restaurante (não mistura itens de restaurantes diferentes)
6. ✅ `DEMO_RESTAURANT_ID` removido do código
7. ✅ Fluxo completo de delivery funciona (cardápio → carrinho → checkout)
