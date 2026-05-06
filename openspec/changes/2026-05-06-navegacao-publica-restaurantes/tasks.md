# Tasks: Navegação Pública de Restaurantes (Delivery)

## Phase 1: API Pública de Restaurantes
- [ ] 1.1 Criar API route `src/app/api/restaurants/route.ts` (GET - lista restaurantes ativos)
- [ ] 1.2 Criar API route `src/app/api/restaurants/[id]/route.ts` (GET - detalhes do restaurante)
- [ ] 1.3 Testar API retorna apenas restaurantes com `ativo = true`
- [ ] 1.4 Testar API retorna 404 para ID inválido

## Phase 2: Componentes de Listagem
- [ ] 2.1 Criar `src/components/restaurant/RestaurantSearch.tsx`
- [ ] 2.2 Criar `src/components/restaurant/RestaurantCard.tsx`
- [ ] 2.3 Criar `src/components/restaurant/RestaurantList.tsx`
- [ ] 2.4 Criar página `src/app/restaurantes/page.tsx`
- [ ] 2.5 Adicionar estilos responsivos (mobile-first)

## Phase 3: Página de Cardápio com RestaurantId
- [ ] 3.1 Criar página `src/app/restaurantes/[restaurantId]/cardapio/page.tsx`
- [ ] 3.2 Criar loading skeleton `src/app/restaurantes/[restaurantId]/cardapio/loading.tsx`
- [ ] 3.3 Atualizar `src/app/(customer)/menu/MenuPageClient.tsx` para receber `restaurantId` via props
- [ ] 3.4 Atualizar `src/app/(customer)/menu/page.tsx` para passar `restaurantId` da URL

## Phase 4: Stores - Isolamento por Restaurante
- [ ] 4.1 Adicionar `restaurantId: string | null` ao `menuStore`
- [ ] 4.2 Adicionar `restaurantId: string | null` ao `cartStore`
- [ ] 4.3 Implementar lógica de limpar carrinho ao trocar de restaurante
- [ ] 4.4 Implementar lógica de isolar carrinho por `restaurantId`

## Phase 5: Cleanup - Remover DEMO_RESTAURANT_ID
- [ ] 5.1 Remover `const DEMO_RESTAURANT_ID` de `MenuPageClient.tsx`
- [ ] 5.2 Verificar se há outros lugares com `DEMO_RESTAURANT_ID` hardcoded
- [ ] 5.3 Garantir que todas as chamadas a `useCardapio` passem `restaurantId` correto

## Phase 6: Testes
- [ ] 6.1 Teste E2E: Usuário acessa `/restaurantes`, ve lista, clica em restaurante
- [ ] 6.2 Teste E2E: Cardápio carrega dados corretos do restaurante
- [ ] 6.3 Teste E2E: Carrinho é isolado por restaurante
- [ ] 6.4 Teste de integração: API `/api/restaurants` funciona corretamente
- [ ] 6.5 Verificar que testes E2E existentes ainda passam

## Phase 7: Documentação e Cleanup
- [ ] 7.1 Documentar nova estrutura de rotas em `codemap.md`
- [ ] 7.2 Atualizar `AGENTS.md` se necessário
- [ ] 7.3 Criar feature flag `NEXT_PUBLIC_ENABLE_NEW_RESTAURANT_ROUTES` (opcional, para rollback)

---

## Notas

- **Salão/Mesa:** QR Code e identificação de mesa serão implementados futuramente, após o launch de delivery
- **Auth:** Cliente faz pedido sem login (checkout anônimo)
- **Offline:** Cardápio offline funciona por restaurante (já implementado no cache)