# stuff

> ⚠️ **AUTOMATICALLY GENERATED** - Não edite manualmente. Regenere com `agents/scripts/document-gaps.sh`

# Arquitetura & Infraestrutura

## Sistema de Feature Flags
- **O que é**: `src/lib/feature-flags.ts` - 9 flags configuráveis por ambiente
- **Flags**: `offline`, `pix`, `stripe`, `waiter_mode`, `qr_code`, `combos`, `analytics`, `cashback`, `guest_checkout`
- **Relevância**: Controla funcionalidades críticas do sistema
- **Doc atual**: Nenhuma

## Cross-Tab Sync (BroadcastChannel)
- **O que é**: `src/lib/broadcast-channel.ts` - sincroniza carrinho entre abas do navegador
- **Relevância**: Carrinho compartilhado entre múltiplas abas
- **Doc atual**: Não mencionado em nenhum spec

## DDD JÁ Implementado (contradiz docs)
- **O que é**: Estrutura completa em `src/domain/`, `src/application/`, `src/infrastructure/`
- **Conteúdo**: Entities, Value Objects, Aggregates, Events, Repository interfaces, EventDispatcher
- **Problema**: `codemap.md` informa que DDD está "planejado mas não implementado" - JÁ ESTÁ IMPLEMENTADO
- **Relevância**: Arquitetura real do projeto está defasada na documentação

## Padrões DDD (ValueObject, Entity, AggregateRoot)
- **O que é**: Classes base em `src/domain/shared/types/`
- **Relevância**: Base para todo o domínio DDD
- **Doc atual**: Não documentado

## EventDispatcher (Singleton)
- **O que é**: `src/domain/shared/events/EventDispatcher.ts` - sistema de eventos do domínio
- **Events**: `PedidoCriadoEvent`, `PedidoStatusAlteradoEvent`, `PagamentoConfirmadoEvent`
- **Relevância**: Padrão Observer para domain events

## Validação de QR Code (Timing-Safe)
- **O que é**: `src/lib/qr/validator.ts` - usa `timingSafeEqual` para prevenir timing attacks
- **Relevância**: Segurança contra ataques de timing

## Service Worker Update Notification
- **O que é**: `src/lib/sw/register.ts` - `notifyUpdate()` pergunta ao usuário se quer recarregar quando há novo SW
- **Relevância**: UX para update de service worker

## BackgroundSyncPlugin (24h retention)
- **O que é**: `public/sw.js` - Workbox BackgroundSyncPlugin com `maxRetentionTime: 24 * 60`
- **Relevância**: Pedidos offline syncados automaticamente por até 24h

---

# Offline & Sync

## Cache de Menu (TTL 24h)
- **O que é**: `src/lib/offline/cache.ts` - cache de cardápio com TTL configurável
- **Relevância**: Menu disponível offline por 24h

## Sistema de Sync com Exponential Backoff
- **O que é**: `src/lib/offline/sync.ts` - retry: 1s, 2s, 4s... até 30s, max 3 retries
- **Relevância**: Determina como pedidos offline são syncados

## Compressão de Menu (preparado)
- **O que é**: `compressMenuData/decompressMenuData` em `src/lib/offline/cache.ts`
- **Estado**: Currently JSON.stringify (placeholder para LZ-string etc)
- **Relevância**: Preparado para otimizar storage offline

---

# Pedidos & Realtime

## Realtime com Polling Fallback (10s)
- **O que é**: `src/hooks/useRealtimeOrders.ts` - fallback de polling a cada 10s
- **Relevância**: Pedidos atualizados mesmo se realtime falhar

## Hooks useKitchenOrders e useRealtimeConnection
- **O que é**:
  - `useKitchenOrders` - orders sorted by age, stale detection
  - `useRealtimeConnection` - mede latência e status de conexão
- **Relevância**: Funcionalidades para cozinha e detecção de connectivity

## Status Transitions (FSM)
- **O que é**: `src/services/adminOrderService.ts` - `VALID_STATUS_TRANSITIONS`, `isValidStatusTransition()`, `getAllowedTransitions()`
- **Fluxo**: pending -> confirmed -> preparing -> ready -> delivered
- **Relevância**: Garante transições válidas de status

## Order Age Display
- **O que é**: `getOrderAge()`, `getOrderAgeDisplay()`, `isOrderStale()`
- **Relevância**: Mostra tempo desde criação e detecta pedidos stale (>5min)

## Latência do Realtime
- **O que é**: `useRealtimeConnection` - ping a cada 30s
- **Relevância**: Monitora qualidade da conexão

---

# Carrinho & Menu

## CartStore selectors (getTotalItems, getTotalPrice, getSubtotal)
- **O que é**: `src/stores/cartStore.ts` - selectors para cálculo de totais
- **Relevância**: Lógica de cálculo de preço (combos vs regular)

## MenuStore selectors (getFilteredProducts, hydrateFromCache)
- **O que é**: `src/stores/menuStore.ts` - filtragem por categoria, dietary labels (AND logic), busca
- **Relevância**: Funcionalidade de busca e filtro do cardápio

## Dietary Labels
- **O que é**: Tipo `DietaryLabel` com 7 tipos em `src/stores/menuStore.ts`
- **Relevância**: Filtros alimentares no cardápio

## Guest Session
- **O que é**: `src/lib/auth/guest.ts` - UUID para identificar sessão guest
- **Relevância**: Checkout sem conta, mas rastreia pedido
- **Storage**: `localStorage` (`pedi-ai-guest-session`)

## Product Modifier Groups (N:N)
- **O que é**: Tabela `product_modifier_groups` - associa produtos a grupos de modificadores
- **Relevância**: Um produto pode ter múltiplos grupos de modificadores

---

# Pagamentos

## Demo Payment Mode
- **O que é**: `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true` - modo demo com dados mock de PIX
- **Relevância**: Permite testar sem Mercado Pago real

## PIX expira em 30 minutos
- **O que é**: Mercado Pago PIX expira em 30 minutos (`expires_at`)
- **Relevância**: Limitação de tempo para pagamento PIX

## Tabela payment_intents
- **O que é**: `src/lib/supabase/types.ts` - `payment_intents` table
- **Relevância**: Armazena intents de pagamento PIX e Stripe

## Stripe não implementado
- **O que é**: `src/app/api/payments/stripe/create-intent/route.ts` - TODO, apenas placeholder
- **Relevância**: Stripe está planejado mas não integrado

---

# Autenticação & Autorização

## Admin Role Hierarchy
- **O que é**: `src/services/userService.ts` - `canManageRole()`, `getRoleLabel()`, `getRoleColor()`
- **Hierarquia**: owner > manager > staff
- **Relevância**:Helpers visuais e restrições de permissão

## Restrições de Roles em APIs Admin
- **O que é**: `src/lib/auth/admin.ts` - `requireRole()` - permite apenas owner/manager para certas operações
- **Relevância**: Staff não pode gerar QR codes ou gerenciar usuários

---

# Mesas & QR Code

## QR Code Storage na tabela
- **O que é**: QR code gerado é armazenado em `tables.qr_code`
- **Relevância**: Persiste QR code para não regenerar

## API reativar mesa (reactivate)
- **O que é**: `PATCH /api/admin/tables/[id]/reactivate`
- **Relevância**: Reativa mesa inativa

## API de validação de mesa
- **O que é**: `src/app/api/tables/validate/route.ts` - valida QR code de mesa
- **Relevância**: Endpoint para cliente validar mesa antes de fazer pedido

## QR Code Crypto Service
- **O que é**: `src/infrastructure/services/QRCodeCryptoService.ts`
- **Relevância**: SupabaseAuthAdapter, StripeAdapter, PixAdapter

---

# DOMÍNIO (DDD)

## Value Object Dinheiro (precisão em centavos)
- **O que é**: `src/domain/pedido/value-objects/Dinheiro.ts` - valor em centavos, operações aritméticas seguras
- **Relevância**: Evita floating point em cálculos monetários

## CalculadoraTotal Service
- **O que é**: `src/domain/pedido/services/CalculadoraTotal.ts` - calcula subtotal, taxa, total
- **Relevância**: Lógica de negócio para cálculo de pedidos

## Aggregates com Validação de Invariantes
- **O que é**: `PedidoAggregate` e `CarrinhoAggregate` validam invariantes
- **Exemplos**: pedido deve ter pelo menos um item, total deve ser igual a soma
- **Relevância**: Encapsula regras de negócio

---

# APIs

## Validação de Carrinho no Servidor
- **O que é**: `src/app/api/cart/validate/route.ts` - valida produtos, preços, modificadores required, mesa
- **Relevância**: Validação server-side completa antes de criar pedido

## Resposta de erro de validação
- **O que é**: API retorna array de erros com `field` e `message`
- **Relevância**: Permite mostrar erros específicos por item

---

# Admin & Analytics

## Analytics date range helpers
- **O que é**: `getLast7Days()`, `getLast30Days()`, `getLast90Days()`, `getThisMonth()`, `getThisYear()`
- **Relevância**: Facilita filtros de analytics

---

# Supabase & Database

## Database Types
- **O que é**: `src/lib/supabase/types.ts` - tipos TypeScript completos para todas as tabelas
- **Relevância**: Geração automática de tipos a partir do banco

## Supabase Edge Functions
- **O que é**: `supabase/functions/pix-webhook/`
- **Relevância**: Webhook PIX via Edge Function

## Realtime Channel Types
- **O que é**: `src/lib/supabase/types.ts` - `RealtimeChannel`, `OrderRealtimePayload`
- **Relevância**: Tipos para realtime subscriptions

---

# Stores (Zustand)

## CartStore (persist + subscribeWithSelector + immer)
- **O que é**: `src/stores/cartStore.ts` usa persist middleware
- **Relevância**: Carrinho persiste entre sessões E sincroniza entre abas

---

# Outros

## Istanbul ignore comments
- **O que é**: `/* istanbul ignore next */` e `/* istanbul ignore if */` no código
- **Relevância**: Code coverage exclusion para testes
- **Onde**: `src/services/tableService.ts`, `src/stores/cartStore.ts`, etc.

---

# Recomendações de Documentação

## Alta Prioridade
1. **DDD JÁ Implementado** - `codemap.md` está incorreto, atualizar para refletir estrutura real
2. **Feature Flags** - documentar flags e como ativar/desativar funcionalidades
3. **Arquitetura Offline** - cache TTL, sync backoff, broadcast channel, background sync
4. **Status Transitions FSM** - documentar todos os estados e transições válidas

## Média Prioridade
5. **Guest Session** - como funciona checkout sem conta
6. **Role Hierarchy** - permissões de owner/manager/staff
7. **Demo Payment Mode** - como testar sem Mercado Pago
8. **Order Age & Stale Detection** - para cozinha

## Baixa Prioridade
9. Dietary Labels - documentar filtros disponíveis
10. Compressão de dados - preparado para future optimization
11. Latência do Realtime - monitorar qualidade da conexão
