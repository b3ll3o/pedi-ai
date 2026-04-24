# Tasks: Admin Full Implementation

## Phase 1: Foundation

### 1.1 Middleware de Autenticação
- [x] 1.1.1 Criar `src/middleware.ts` com proteção para rotas `/admin/*` e `/api/admin/*`
- [x] 1.1.2 Implementar validação de sessão via `createClient()` do Supabase
- [x] 1.1.3 Redirecionar para `/admin/login` se não autenticado (preservar URL original)
- [x] 1.1.4 Testar middleware: usuário não autenticado é redirecionado
- [x] 1.1.5 Testar middleware: usuário autenticado acessa rotas permitidas

### 1.2 Helper Functions de Autenticação
- [x] 1.2.1 Criar `src/lib/auth/admin.ts` com interface `AuthUser`
- [x] 1.2.2 Implementar `requireAuth(): Promise<AuthUser>` - obtém usuário da sessão
- [x] 1.2.3 Implementar `requireRole(user: AuthUser, allowedRoles: Role[])` - valida roles
- [x] 1.2.4 Criar `src/lib/auth/restaurant.ts` com `getRestaurantId(user: AuthUser): string`
- [ ] 1.2.5 Escrever testes unitários para `requireAuth` e `requireRole`

### 1.3 Correções de URLs AdminLayout
- [x] 1.3.1 Audit em `src/components/admin/AdminLayout.tsx` - listar todos os links
- [x] 1.3.2 Verificar cada link contra as rotas existentes em `src/app/admin/`
- [x] 1.3.3 Corrigir links que apontam para rotas inexistentes
- [x] 1.3.4 Verificar se `/admin/pedidos` existe (esperado) vs `/admin/orders` (link atual)
- [x] 1.3.5 Verificar se `/admin/categorias` existe (esperado) vs `/admin/categories` (link atual)
- [x] 1.3.6 Corrigir todos os mismatched URLs

---

## Phase 2: Core - Cardápio (CRUD APIs) [COMPLETE]

### 2.1 APIs de Categorias
- [x] 2.1.1 Implementar `GET /api/admin/categories` - lista categorias do restaurant_id
- [x] 2.1.2 Implementar `POST /api/admin/categories` - cria categoria com requireRole('owner', 'manager')
- [x] 2.1.3 Implementar `GET /api/admin/categories/[id]` - obtém categoria única
- [x] 2.1.4 Implementar `PUT /api/admin/categories/[id]` - atualiza categoria
- [x] 2.1.5 Implementar `DELETE /api/admin/categories/[id]` - soft-delete (deleted_at)
- [x] 2.1.6 Implementar `PATCH /api/admin/categories/reorder` - reordena categorias em batch
- [x] 2.1.7 Adicionar validação: nome é obrigatório, display_order é numérico
- [x] 2.1.8 Testar integração: CRUD categorias via Postman/curl

### 2.2 APIs de Produtos
- [x] 2.2.1 Implementar `GET /api/admin/products` - lista produtos do restaurant_id
- [x] 2.2.2 Implementar `POST /api/admin/products` - cria produto com validação de category_id
- [x] 2.2.3 Implementar `GET /api/admin/products/[id]` - obtém produto único
- [x] 2.2.4 Implementar `PUT /api/admin/products/[id]` - atualiza produto
- [x] 2.2.5 Implementar `DELETE /api/admin/products/[id]` - soft-delete
- [x] 2.2.6 Adicionar validação: nome, price > 0, category_id existe e pertence ao restaurant
- [x] 2.2.7 Testar integração: CRUD produtos

### 2.3 APIs de Modifiers
- [x] 2.3.1 Implementar `GET /api/admin/modifiers` - lista modifier groups do restaurant
- [x] 2.3.2 Implementar `POST /api/admin/modifiers` - cria modifier group
- [x] 2.3.3 Implementar `GET /api/admin/modifiers/[id]` - obtém modifier group com values
- [x] 2.3.4 Implementar `PUT /api/admin/modifiers/[id]` - atualiza modifier group
- [x] 2.3.5 Implementar `DELETE /api/admin/modifiers/[id]` - soft-delete
- [x] 2.3.6 Implementar `POST /api/admin/modifiers/[groupId]/values` - adiciona modifier value
- [x] 2.3.7 Implementar `PUT /api/admin/modifiers/values/[id]` - atualiza modifier value
- [x] 2.3.8 Implementar `DELETE /api/admin/modifiers/values/[id]` - soft-delete
- [x] 2.3.9 Testar integração: CRUD modifier groups e values

### 2.4 APIs de Combos
- [x] 2.4.1 Implementar `GET /api/admin/combos` - lista combos do restaurant
- [x] 2.4.2 Implementar `POST /api/admin/combos` - cria combo com product_ids
- [x] 2.4.3 Implementar `GET /api/admin/combos/[id]` - obtém combo com items
- [x] 2.4.4 Implementar `PUT /api/admin/combos/[id]` - atualiza combo
- [x] 2.4.5 Implementar `DELETE /api/admin/combos/[id]` - soft-delete
- [x] 2.4.6 Validar todos os product_ids pertencem ao restaurant
- [x] 2.4.7 Testar integração: CRUD combos

---

## Phase 3: Core - Pedidos (APIs + UI) [COMPLETE]

### 3.1 APIs de Pedidos (Admin)
- [x] 3.1.1 Implementar `GET /api/admin/orders` com filtros: status, start_date, end_date, page, limit
- [x] 3.1.2 Implementar `GET /api/admin/orders/[id]` - detalhe completo do pedido
- [x] 3.1.3 Implementar `PATCH /api/admin/orders/[id]/status` - atualiza status
- [x] 3.1.4 Adicionar validação de transição de status (não permitir delivered -> preparing)
- [x] 3.1.5 Registrar actor_id e timestamp no order_status_history
- [x] 3.1.6 Emitir evento realtime após atualização de status
- [x] 3.1.7 Usar restaurant_id dinâmico da sessão (não hardcoded)
- [x] 3.1.8 Testar integração: listar, filtrar, atualizar status

### 3.2 UI de Pedidos
- [ ] 3.2.1 Integrar `OrderList.tsx` com `GET /api/admin/orders`
- [ ] 3.2.2 Adicionar filtros de status e data na UI
- [ ] 3.2.3 Adicionar paginação na UI
- [ ] 3.2.4 Integrar `OrderDetailAdmin.tsx` com `GET /api/admin/orders/[id]`
- [ ] 3.2.5 Adicionar botão de atualização de status em OrderDetail
- [ ] 3.2.6 Exibir histórico de status com actor e timestamp
- [ ] 3.2.7 Corrigir link em AdminLayout para `/admin/pedidos`

---

## Phase 4: Core - UI de Cardápio Integrada [COMPLETE]

### 4.1 UI de Categorias
- [x] 4.1.1 Integrar `CategoryList.tsx` com `GET /api/admin/categories`
- [x] 4.1.2 Adicionar botão de criar nova categoria
- [x] 4.1.3 Adicionar botão de editar (navega para form)
- [x] 4.1.4 Adicionar botão de deletar com confirmação
- [x] 4.1.5 Integrar `CategoryForm.tsx` com POST/PUT APIs
- [x] 4.1.6 Implementar drag-drop ou input numérico para reordenar
- [x] 4.1.7 Chamar `PATCH /api/admin/categories/reorder` ao reordenar
- [x] 4.1.8 Adicionar feedback visual (loading, success, error)
- [x] 4.1.9 Chamar `revalidatePath()` após mutações

### 4.2 UI de Produtos
- [x] 4.2.1 Integrar `ProductList.tsx` com `GET /api/admin/products`
- [x] 4.2.2 Adicionar filtros por categoria
- [x] 4.2.3 Adicionar CRUD actions (criar, editar, deletar)
- [x] 4.2.4 Integrar `ProductForm.tsx` com POST/PUT APIs
- [x] 4.2.5 Upload de imagem (se ainda não implementado)
- [x] 4.2.6 Adicionar validações client-side
- [x] 4.2.7 Testar fluxo completo: criar produto com modifiers

### 4.3 UI de Modifiers e Combos
- [x] 4.3.1 Criar/adicionar `ModifierGroupForm.tsx` integrado com APIs
- [x] 4.3.2 Criar/adicionar `ComboForm.tsx` integrado com APIs
- [x] 4.3.3 Implementar listagem de modifier groups por produto
- [x] 4.3.4 Implementar listagem de combos
- [x] 4.3.5 Adicionar validações (min/max selections para modifiers)

---

## Phase 5: Infrastructure - Roles e Restaurant ID [COMPLETE]

### 5.1 Validação de Roles em Todas APIs
- [x] 5.1.1 Audit em todas as APIs admin existentes
- [x] 5.1.2 Adicionar `requireAuth()` em todas as rotas
- [x] 5.1.3 Adicionar `requireRole()` apropriado:
  - Categorias, Produtos, Modifiers, Combos, Mesas, Pedidos: owner, manager
  - Usuários, Settings: owner only
  - Pedidos (leitura): owner, manager, staff
- [x] 5.1.4 Substituir todos `restaurant_id` hardcoded por `getRestaurantId(user)`

### 5.2 Correção de Restaurant ID Dinâmico
- [x] 5.2.1 Audit: encontrar todas instâncias de `'demo-restaurant'` ou hardcoded restaurant_id
- [x] 5.2.2 Substituir por extração da sessão do usuário

---

## Phase 6: Mesas e QR Codes [COMPLETE]

### 6.1 APIs de Mesas (já existem stubs)
- [x] 6.1.1 Integrar APIs existentes com requireAuth/requireRole
- [x] 6.1.2 Verificar `POST /api/admin/tables` - cria mesa + QR code
- [x] 6.1.3 Verificar `GET /api/admin/tables/[id]/qr` - regenera QR
- [x] 6.1.4 Implementar `PATCH /api/admin/tables/[id]/reactivate`
- [x] 6.2.1 Integrar `TableManagement.tsx` com APIs
- [x] 6.2.2 Integrar `TableQRCode.tsx` com endpoint de QR
- [x] 6.2.3 Adicionar botão de download do QR code
- [x] 6.2.4 Adicionar feedback de table unavailable para mesas inativas

---

## Phase 7: Usuários e Configurações [COMPLETE]

### 7.1 APIs de Usuários
- [x] 7.1.1 Implementar `GET /api/admin/users` - lista usuários do restaurant
- [x] 7.1.2 Implementar `POST /api/admin/users` - cria usuário (owner only)
- [x] 7.1.3 Implementar `GET /api/admin/users/[id]` - detalhe do usuário
- [x] 7.1.4 Implementar `PATCH /api/admin/users/[id]` - atualiza role
- [x] 7.1.5 Proteger com requireRole(['owner'])
- [x] 7.1.6 Testar: manager/staff não consegue acessar APIs de users

### 7.2 UI de Usuários
- [x] 7.2.1 Criar `UserManagement.tsx` componente
- [x] 7.2.2 Criar `UserForm.tsx` para criar/editar usuários
- [x] 7.2.3 Integrar com APIs
- [x] 7.2.4 Adicionar proteção: só owner vê menu de usuários

### 7.3 Página de Configurações
- [x] 7.3.1 Criar `src/app/admin/configuracoes/page.tsx` (rota faltante!)
- [x] 7.3.2 Criar `src/app/api/admin/settings/route.ts`
- [x] 7.3.3 Definir campos de configuração (nome restaurante, etc)
- [x] 7.3.4 Proteger com requireRole(['owner'])
- [x] 7.3.5 Adicionar link em AdminLayout

---

## Phase 8: Analytics Dashboard [COMPLETE]

### 8.1 API de Analytics
- [x] 8.1.1 Implementar `GET /api/admin/analytics/orders` - pedidos por período
- [x] 8.1.2 Agrupar por dia/semana/mês conforme param
- [x] 8.1.3 Calcular revenue total no período
- [x] 8.1.4 Implementar `GET /api/admin/analytics/popular-items` - top 10 produtos
- [x] 8.1.5 Usar restaurant_id dinâmico
- [x] 8.1.6 Testar: verificar dados corretos para período selecionado

### 8.2 UI de Analytics
- [x] 8.2.1 Criar/adicionar `AnalyticsDashboard.tsx`
- [x] 8.2.2 Integrar com APIs de analytics
- [x] 8.2.3 Adicionar seletor de período (dia/semana/mês)
- [x] 8.2.4 Exibir gráfico de pedidos por período
- [x] 8.2.5 Exibir lista de populares
- [x] 8.2.6 Adicionar link em AdminLayout

---

## Phase 9: Testes [PENDING - Testing Phase]

### 9.1 Testes Unitários
- [ ] 9.1.1 Testar `requireAuth()` - usuário válido/inválido
- [ ] 9.1.2 Testar `requireRole()` - roles autorizadas/não autorizadas
- [ ] 9.1.3 Testar transições de status de pedido (válidas e inválidas)
- [ ] 9.1.4 Verificar cobertura >= 80%

### 9.2 Testes de Integração
- [ ] 9.2.1 Testar CRUD categorias via API
- [ ] 9.2.2 Testar CRUD produtos via API
- [ ] 9.2.3 Testar filtros de pedidos
- [ ] 9.2.4 Testar RBAC: cada role acessa o esperado

### 9.3 Testes E2E (Playwright)
- [ ] 9.3.1 `admin/login.spec.ts` - login com credenciais válidas/inválidas
- [ ] 9.3.2 `admin/categories.spec.ts` - criar, editar, deletar categoria
- [ ] 9.3.3 `admin/products.spec.ts` - criar produto com modifiers
- [ ] 9.3.4 `admin/orders.spec.ts` - visualizar pedido, atualizar status
- [ ] 9.3.5 `admin/rbac.spec.ts` - verificar acesso negado para roles erradas
- [ ] 9.3.6 `admin/tables.spec.ts` - criar mesa, gerar QR

### 9.4 Verificação de Compliance
- [ ] 9.4.1 Verificar que todas APIs usam restaurant_id da sessão
- [ ] 9.4.2 Verificar que RBAC está aplicado em todas as rotas
- [ ] 9.4.3 Verificar que UI não permite navegação a páginas não autorizadas

---

## Phase 10: Deployment

### 10.1 Pre-Deploy
- [ ] 10.1.1 Feature flag `ADMIN_AUTH_ENABLED` configurado
- [ ] 10.1.2 Testar em staging com dados de produção espelhados
- [ ] 10.1.3 Review de código por pares
- [ ] 10.1.4 Verificar que todos os testes passam

### 10.2 Deploy
- [ ] 10.2.1 Deploy feature branch para staging
- [ ] 10.2.2 Executar smoke tests em staging
- [ ] 10.2.3 Habilitar feature flag em produção
- [ ] 10.2.4 Monitorar erros em produção

### 10.3 Rollback Plan
- [ ] 10.3.1 Desabilitar feature flag para desativar admin
- [ ] 10.3.2 Reverter branch se necessário
- [ ] 10.3.3 Documentar procedimento de rollback

---

## Summary

**Total Tasks**: ~120 tasks
**Phases**: 10 fases
**Prioridade**: Phase 1 (Foundation) → Phase 2-3 (Core Cardápio/Pedidos) → Phase 5 (RBAC) → Phase 6-8 (Complementos) → Phase 9-10 (Testes/Deploy)

**Ordem de Execução**:
1. Criar middleware e helpers de auth (Foundation)
2. Corrigir URLs AdminLayout (Foundation)
3. Implementar CRUD de Categorias e Produtos (Core)
4. Implementar CRUD de Modifiers e Combos (Core)
5. Implementar gestão de Pedidos com filtros (Core)
6. Integrar UI com APIs de cardápio (Core)
7. Aplicar RBAC em todas APIs (Infrastructure)
8. Implementar Mesas, Usuários, Configurações (Complementos)
9. Implementar Analytics (Complementos)
10. Testes e Deploy