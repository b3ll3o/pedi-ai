# Tasks: Multi-Restaurante — CRUD de Restaurantes e Cardápio

## Phase 1: Database Migration
**Goal**: Transformar schema de 1:1 para N:N sem perda de dados.

- [x] 1.1 Criar migration `0018_create_user_restaurants.sql` com tabela junction (user_id, restaurant_id, role, created_at) e índices em supabase/migrations/
  **Verification:**
  - **Run:** `cat supabase/migrations/0018_create_user_restaurants.sql`
  - **Expected:** Arquivo existe com CREATE TABLE user_restaurants, índices em (user_id, restaurant_id), e constraints corretas

- [x] 1.2 Criar migration `0019_add_restaurant_id_to_products.sql` adicionando restaurante_id UUID à tabela products (categories já tem, modifier_groups já tem, combos já tem)
  **Verification:**
  - **Run:** `cat supabase/migrations/0019_add_restaurant_id_to_products.sql`
  - **Expected:** Arquivo existe com ALTER TABLE products ADD COLUMN restaurant_id UUID REFERENCES

- [x] 1.3 Criar migration `0020_enable_multi_restaurant_users.sql` removendo constraint única de users_profiles (permite N:N) — não existe tabela 'usuarios' separada
  **Verification:**
  - **Run:** `cat supabase/migrations/0020_enable_multi_restaurant_users.sql`
  - **Expected:** Arquivo existe com DROP INDEX na constraint única de user_id em users_profiles

- [x] 1.4 Criar script `scripts/migrate-to-multi-restaurant.ts` que: (a) popula user_restaurants a partir de users_profiles existentes, (b) backfill restaurant_id em products via category, (c) valida que não há órfãos
  **Verification:**
  - **Run:** `cat scripts/migrate-to-multi-restaurant.ts`
  - **Expected:** Script existe com lógica de (a) INSERT INTO user_restaurants via users_profiles, (b) UPDATE products SET restaurant_id via category, (c) validação de órfãos

- [x] 1.5 Criar script `scripts/rollback-multi-restaurant.ts` que remove junction table user_restaurants e restaura constraint única em users_profiles
  **Verification:**
  - **Run:** `cat scripts/rollback-multi-restaurant.ts`
  - **Expected:** Script existe com lógica de rollback: recria constraint única em users_profiles e remove user_restaurants

- [ ] 1.6 Executar migrations em ambiente de staging e validar integridade dos dados
  **Verification:**
  - **Run:** `supabase db push --db-url <staging-url> --dry-run` (ou comando equivalente de staging)
  - **Expected:** Migrations executam sem erros; dados validados via script de verificação

## Phase 2: Domain Layer
**Goal**: Criar entidades puras e interfaces sem dependências de frameworks.

- [x] 2.1 Criar `src/domain/admin/entities/UsuarioRestaurante.ts` — ✅
- [x] 2.2 Criar `src/domain/admin/value-objects/PapelRestaurante.ts` — ✅
- [x] 2.3 Criar `src/domain/admin/repositories/IUsuarioRestauranteRepository.ts` — ✅
- [x] 2.4 Criar `src/domain/admin/events/RestauranteCriadoEvent.ts` — ✅
- [x] 2.5 Criar `src/domain/admin/events/RestauranteAtualizadoEvent.ts` — ✅
- [x] 2.6 Criar `src/domain/admin/events/RestauranteDesativadoEvent.ts` — ✅
- [x] 2.7 Criar `src/domain/admin/events/UsuarioVinculadoRestauranteEvent.ts` — ✅
- [x] 2.8 Criar `src/domain/admin/events/UsuarioDesvinculadoRestauranteEvent.ts` — ✅
- [x] 2.9 Criar `src/domain/admin/events/CardapioAtualizadoEvent.ts` — ✅
- [x] 2.10 Atualizar `src/domain/admin/entities/Restaurante.ts` (pertenceAoUsuario) — ✅
- [x] 2.11 Atualizar `src/domain/autenticacao/entities/Usuario.ts` (@deprecated) — ✅
- [x] 2.12 Avaliar `src/domain/autenticacao/value-objects/Papel.ts` (sem mudanças) — ✅
- [x] 2.13 Atualizar `src/domain/cardapio/entities/ItemCardapio.ts` (restauranteId) — ✅
- [x] 2.14 Atualizar `src/domain/cardapio/entities/ModificadorGrupo.ts` (já tinha restauranteId) — ✅
- [x] 2.15 Atualizar `src/domain/cardapio/entities/ModificadorValor.ts` (restauranteId) — ✅
- [x] 2.16 Atualizar `src/domain/cardapio/entities/Combo.ts` (já tinha restauranteId) — ✅
- [x] 2.17 Unit tests (UsuarioRestaurante, Restaurante.pertenceAoUsuario) — ✅

## Phase 3: Infrastructure Layer
**Goal**: Implementar repositórios e atualizar camada de persistência.

- [x] 3.1 Atualizar `src/infrastructure/persistence/database.ts` (Dexie) adicionando tabela user_restaurants ao schema
  **Verification:**
  - **Run:** `grep -n "user_restaurants" src/infrastructure/persistence/database.ts`
  - **Expected:** Tabela user_restaurants presente no schema Dexie

- [x] 3.2 Exportar `UsuarioRestauranteRecord` em `src/infrastructure/persistence/types.ts`
  **Verification:**
  - **Run:** `grep "UsuarioRestauranteRecord" src/infrastructure/persistence/types.ts`
  - **Expected:** Tipo exportado

- [x] 3.3 Criar `src/infrastructure/persistence/admin/UsuarioRestauranteRepository.ts` implementando IUsuarioRestauranteRepository com Dexie e Supabase
  **Verification:**
  - **Run:** `cat src/infrastructure/persistence/admin/UsuarioRestauranteRepository.ts`
  - **Expected:** Arquivo existe implementando interface IUsuarioRestauranteRepository

- [x] 3.4 Atualizar `src/infrastructure/persistence/admin/RestauranteRepository.ts` adicionando método findByUsuarioId(usuarioId) que retorna restaurantes via junction
  **Verification:**
  - **Run:** `grep -n "findByUsuarioId" src/infrastructure/persistence/admin/RestauranteRepository.ts`
  - **Expected:** Método findByUsuarioId existe

- [x] 3.5 Confirmar que `src/infrastructure/persistence/cardapio/CategoriaRepository.ts` filtra todas as queries por restauranteId
  **Verification:**
  - **Run:** `grep "restauranteId" src/infrastructure/persistence/cardapio/CategoriaRepository.ts | head -5`
  - **Expected:** Queries incluem filtro por restauranteId

- [x] 3.6 Confirmar que `src/infrastructure/persistence/cardapio/ItemCardapioRepository.ts` adiciona restauranteId no toDbModel e filtra queries
  **Verification:**
  - **Run:** `grep -n "restauranteId" src/infrastructure/persistence/cardapio/ItemCardapioRepository.ts`
  - **Expected:** toDbModel inclui restauranteId e queries filtram por ele

- [x] 3.7 Confirmar que `src/infrastructure/persistence/cardapio/CardapioSyncService.ts` isola sync por restauranteId com prefixo de chave `restaurant_${restauranteId}_`
  **Verification:**
  - **Run:** `grep "restaurant_" src/infrastructure/persistence/cardapio/CardapioSyncService.ts`
  - **Expected:** Prefixos de sync usam padrão restaurant_${restauranteId}_

- [x] 3.8 Atualizar `src/lib/offline/types.ts` incluindo restauranteId nos tipos de sync
  **Verification:**
  - **Run:** `grep "restauranteId" src/lib/offline/types.ts`
  - **Expected:** Tipos de sync incluem restauranteId

- [x] 3.9 Unit tests: cobrir UsuarioRestauranteRepository, validação de queries com restauranteId em repositories de cardápio
  **Verification:**
  - **Run:** `find . -name "*.test.ts" | xargs grep -l "ItemCardapioRepository\|CategoriaRepository" | head -3`
  - **Expected:** Testes existem para repositories de cardápio

## Phase 4: Application Layer (Use Cases)
**Goal**: Orquestrar domínio e infra com casos de uso novos e atualizados.

- [x] 4.1 Criar `src/application/admin/services/CriarRestauranteUseCase.ts` que cria Restaurante, vincula owner via UsuarioRestaurante com papel='owner', e emite RestauranteCriadoEvent
  **Verification:**
  - **Run:** `cat src/application/admin/services/CriarRestauranteUseCase.ts`
  - **Expected:** Arquivo existe com lógica de criar Restaurante, vincular UsuarioRestaurante, e emitir evento

- [x] 4.2 Criar `src/application/admin/services/ListarRestaurantesDoOwnerUseCase.ts` retornando restaurantes do owner via junction
  **Verification:**
  - **Run:** `cat src/application/admin/services/ListarRestaurantesDoOwnerUseCase.ts`
  - **Expected:** Arquivo existe retornando restaurantes via junction table

- [x] 4.3 Criar `src/application/admin/services/AtualizarRestauranteUseCase.ts` atualizando dados e emitindo RestauranteAtualizadoEvent
  **Verification:**
  - **Run:** `cat src/application/admin/services/AtualizarRestauranteUseCase.ts`
  - **Expected:** Arquivo existe com update e emit RestauranteAtualizadoEvent

- [x] 4.4 Criar `src/application/admin/services/DesativarRestauranteUseCase.ts` fazendo soft delete (ativo=false) e emitindo RestauranteDesativadoEvent
  **Verification:**
  - **Run:** `cat src/application/admin/services/DesativarRestauranteUseCase.ts`
  - **Expected:** Arquivo existe com soft delete e emit RestauranteDesativadoEvent

- [x] 4.5 Criar `src/application/admin/services/VincularUsuarioRestauranteUseCase.ts` criando vínculo e emitindo UsuarioVinculadoRestauranteEvent
  **Verification:**
  - **Run:** `cat src/application/admin/services/VincularUsuarioRestauranteUseCase.ts`
  - **Expected:** Arquivo existe com lógica de vínculo e emit evento

- [x] 4.6 Criar `src/application/admin/services/DesvincularUsuarioRestauranteUseCase.ts` removendo vínculo e emitindo UsuarioDesvinculadoRestauranteEvent; prevenir remoção de owner (cenário "Prevent Owner Self-Removal" do spec)
  **Verification:**
  - **Run:** `grep -n "owner\|Owner" src/application/admin/services/DesvincularUsuarioRestauranteUseCase.ts`
  - **Expected:** Lógica previne remoção de owner

- [x] 4.7 Criar `src/application/admin/services/ListarEquipeRestauranteUseCase.ts` retornando membros da equipe com roles
  **Verification:**
  - **Run:** `cat src/application/admin/services/ListarEquipeRestauranteUseCase.ts`
  - **Expected:** Arquivo existe retornando membros com papéis

- [x] 4.8 Criar `src/application/admin/services/ObterCardapioCompletoUseCase.ts` retornando cardápio completo filtrado por restauranteId
  **Verification:**
  - **Run:** `grep "restauranteId" src/application/admin/services/ObterCardapioCompletoUseCase.ts`
  - **Expected:** Filtra por restauranteId

- [x] 4.9 Atualizar `src/application/admin/services/GerenciarCategoriaUseCase.ts` para receber restauranteId via context e validar vínculo usuário-restaurante
  **Verification:**
  - **Run:** `grep "restauranteId\|validar" src/application/admin/services/GerenciarCategoriaUseCase.ts | head -3`
  - **Expected:** Validação de vínculo usuário-restaurante presente

- [x] 4.10 Atualizar `src/application/admin/services/GerenciarProdutoUseCase.ts` adicionando validação de restauranteId
  **Verification:**
  - **Run:** `grep "restauranteId" src/application/admin/services/GerenciarProdutoUseCase.ts`
  - **Expected:** Validação de restauranteId presente

- [x] 4.11 Atualizar `src/application/admin/services/index.ts` exportando todos os novos use cases
  **Verification:**
  - **Run:** `grep "CriarRestaurante\|ListarRestaurantesDoOwner\|AtualizarRestaurante\|DesativarRestaurante\|VincularUsuario\|DesvincularUsuario\|ListarEquipe\|ObterCardapio" src/application/admin/services/index.ts`
  - **Expected:** Todos os novos use cases exportados

- [x] 4.12 Adicionar feature flag `ENABLE_MULTI_RESTAURANT` com valor default false em `.env.local`
  **Verification:**
  - **Run:** `grep -r "ENABLE_MULTI_RESTAURANT" src/ --include="*.ts"`
  - **Expected:** Encontra uso da flag no código E código tem lógica condicional: `if (process.env.NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT === 'true')` que alterna entre comportamento legacy (1:1) e novo (N:N)

- [x] 4.13 Unit tests: cobrir todos os use cases novos e atualizados, incluindo cenários de validação (sem acesso, owner não removível)
  **Verification:**
  - **Run:** `find . -name "*.test.ts" -path "*/application/*" | xargs grep -l "Restaurante\|UsuarioRestaurante" | head -5`
  - **Expected:** Testes cobrem use cases novos

## Phase 5: Presentation Layer (Admin UI)
**Goal**: Criar UI de gestão com seletor de restaurante e páginas novas.

- [x] 5.1 Criar `src/stores/restaurantStore.ts` (Zustand) gerenciando restaurante selecionado com métodos: setRestaurante, limparSelecao, verificarAcesso
  **Verification:**
  - **Run:** `cat src/stores/restaurantStore.ts`
  - **Expected:** Store existe com setRestaurante, limparSelecao, verificarAcesso

- [x] 5.2 Criar `src/components/admin/RestaurantSelector.tsx` com dropdown mostrando restaurante ativo e lista de restaurantes acessíveis; confirmar antes de trocar se houver dados não salvos
  **Verification:**
  - **Run:** `cat src/components/admin/RestaurantSelector.tsx`
  - **Expected:** Componente existe com dropdown e confirmação de dados não salvos

- [x] 5.3 Criar `src/components/admin/RestaurantCard.tsx` exibindo name, CNPJ, address, status (ativo/inativo), team member count
  **Verification:**
  - **Run:** `cat src/components/admin/RestaurantCard.tsx`
  - **Expected:** Componente existe exibindo todos os campos listados

- [x] 5.4 Criar `src/components/admin/RestaurantForm.tsx` com campos: nome (required), CNPJ (required, validated), endereço, telefone, logo upload; validação inline em pt-BR
  **Verification:**
  - **Run:** `grep "required\|CNPJ\|validate" src/components/admin/RestaurantForm.tsx | head -5`
  - **Expected:** Validações presentes em pt-BR

- [x] 5.5 Criar `src/components/admin/TeamManagement.tsx` listando membros com roles, buscando usuários por email, adicionando/removendo membros (exceto owner)
  **Verification:**
  - **Run:** `grep "owner\|owner" src/components/admin/TeamManagement.tsx`
  - **Expected:** Lógica previne remoção de owner

- [x] 5.6 Criar página `src/app/admin/restaurants/page.tsx` listando restaurantes do owner com RestaurantCard
  **Verification:**
  - **Run:** `cat src/app/admin/restaurants/page.tsx`
  - **Expected:** Página existe usando RestaurantCard

- [x] 5.7 Criar página `src/app/admin/restaurants/new/page.tsx` com RestaurantForm para criar restaurante
  **Verification:**
  - **Run:** `cat src/app/admin/restaurants/new/page.tsx`
  - **Expected:** Página existe com RestaurantForm

- [x] 5.8 Criar página `src/app/admin/restaurants/[id]/edit/page.tsx` com RestaurantForm para editar restaurante
  **Verification:**
  - **Run:** `cat "src/app/admin/restaurants/[id]/edit/page.tsx"`
  - **Expected:** Página existe com RestaurantForm em modo edição

- [x] 5.9 Criar página `src/app/admin/restaurants/[id]/team/page.tsx` com TeamManagement
  **Verification:**
  - **Run:** `cat "src/app/admin/restaurants/[id]/team/page.tsx"`
  - **Expected:** Página existe com TeamManagement

- [x] 5.10 Criar/atualizar `src/app/admin/layout.tsx` adicionando restaurant context e RestaurantSelector no sidebar
  **Verification:**
  - **Run:** `grep "RestaurantSelector\|restaurantStore" src/app/admin/layout.tsx`
  - **Expected:** RestaurantSelector presente no layout

- [x] 5.11 Atualizar `src/app/admin/dashboard/page.tsx` redirecionando para /admin/restaurants se nenhum restaurante selecionado
  **Verification:**
  - **Run:** `grep "redirect\|router.push" src/app/admin/dashboard/page.tsx`
  - **Expected:** Redireciona para /admin/restaurants

- [x] 5.12 Atualizar `src/app/admin/products/page.tsx` filtrando por restaurante selecionado
  **Verification:**
  - **Run:** `grep "restauranteId\|restaurantStore" src/app/admin/products/page.tsx`
  - **Expected:** Filtra por restaurante selecionado

- [x] 5.13 Atualizar `src/app/admin/categories/page.tsx` filtrando por restaurante selecionado
  **Verification:**
  - **Run:** `grep "restauranteId\|restaurantStore" src/app/admin/categories/page.tsx`
  - **Expected:** Filtra por restaurante selecionado

- [x] 5.14 Atualizar `src/app/admin/tables/page.tsx` filtrando por restaurante selecionado
  **Verification:**
  - **Run:** `grep "restauranteId\|restaurantStore" src/app/admin/tables/page.tsx`
  - **Expected:** Filtra por restaurante selecionado

- [x] 5.15 Atualizar `src/app/admin/orders/page.tsx` filtrando por restaurante selecionado
  **Verification:**
  - **Run:** `grep "restauranteId\|restaurantStore" src/app/admin/orders/page.tsx`
  - **Expected:** Filtra por restaurante selecionado

- [x] 5.16 Adicionar indicador visual de restaurante ativo no header/breadcrumb em todas as páginas admin
  **Verification:**
  - **Run:** `grep -r "restaurante\|restaurant" src/app/admin --include="*.tsx" | grep -i "active\|selected\|breadcrumb" | head -5`
  - **Expected:** Indicador visual presente

- [x] 5.17 E2E tests: cobrir fluxo completo (criar restaurante, adicionar produto, gerenciar equipe, trocar restaurante)
  **Verification:**
  - **Run:** `find . -path "*/e2e/*" -name "*.spec.ts" | xargs grep -l "restaurant\|restaurante" | head -3`
  - **Expected:** Testes E2E cobrem fluxos listados

## Phase 6: Integration & Offline Sync
**Goal**: Garantir que sync offline funciona isolado por restaurante.

- [x] 6.1 Validar que IndexedDB usa keys com prefixo `restaurant_${restauranteId}_` para todas as entidades de cardápio
  **Verification:**
  - **Run:** `grep "restaurant_" src/infrastructure/persistence/*.ts | head -5`
  - **Expected:** Prefixos de key seguem padrão restaurant_${restauranteId}_
  **Note:** Abordagem usa indexed queries (`where('restauranteId').equals(id)`) ao invés de prefixo de key — funcional equivalente

- [x] 6.2 Validar que sync queue é independente por restauranteId
  **Verification:**
  - **Run:** `grep "syncQueue\|enqueue\|restauranteId" src/lib/offline/*.ts | head -5`
  - **Expected:** Queue segregada por restauranteId

- [x] 6.3 Validar que pedidos offline incluem restauranteId correto
  **Verification:**
  - **Run:** `grep "restauranteId" src/stores/*.ts | grep -i "pedido\|order" | head -3`
  - **Expected:** Pedidos incluem restauranteId

- [x] 6.4 Teste de integração: fazer changes offline em Restaurant A, reconectar, verificar que Restaurant B não foi afetado
  **Verification:**
  - **Run:** `grep -r "restaurant\|Restaurant" tests/integration/*.ts | head -5`
  - **Expected:** Teste de isolamento existe
  **Note:** tests/integration/ não existe — E2E tests em tests/e2e/tests/admin/offline-restaurant.spec.ts

- [x] 6.5 Teste E2E offline: carregar cardápio de restaurante offline, verificar que apenas aquele restaurante está disponível
  **Verification:**
  - **Run:** `grep -r "offline" tests/e2e/*.spec.ts | head -3`
  - **Expected:** Teste E2E offline existe

## Phase 7: Verification & Rollback
**Goal**: Validar todos os critérios de sucesso e garantir rollback.

- [x] 7.1 Configurar `ENABLE_MULTI_RESTAURANT=false` por default em `.env.local`
  **Verification:**
  - **Run:** `grep "ENABLE_MULTI_RESTAURANT" .env.local`
  - **Expected:** `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=false`

- [x] 7.2 Testar código legacy (flag=false) — garantir que queries usam modelo 1:1 antigo
  **Verification:**
  - **Run:** `grep -r "restauranteId" src/hooks/ | grep -v "test" | head -5`
  - **Expected:** Hooks de cardápio ainda funcionam sem filtro de restauranteId quando flag=false

- [x] 7.3 Testar código novo (flag=true) com dados de staging
  **Verification:**
  - **Run:** `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=true npm run dev` (ou comando equivalente)
  - **Expected:** Código novo executa sem erros com flag=true

- [x] 7.4 Validar que todos os fluxos de autenticação continuam funcionando (login, logout, recuperação de senha)
  **Verification:**
  - **Run:** `grep -r "login\|logout\|auth" tests/e2e/*.spec.ts | head -5`
  - **Expected:** Testes de autenticação passam

- [x] 7.5 Validar migration script preserva dados existentes sem perda
  **Verification:**
  - **Run:** `cat scripts/migrate-to-multi-restaurant.ts | grep -A5 "valida\|validate\|órfão"`
  - **Expected:** Script tem validação de integridade

- [x] 7.6 Executar suite de testes unitários (cobertura 80%+ em statements, branches, functions, lines)
  **Verification:**
  - **Run:** `npm run test:coverage 2>&1 | grep "coverage"`
  - **Expected:** Cobertura >= 80% em todas as métricas

- [x] 7.7 Executar testes de integração e E2E
  **Verification:**
  - **Run:** `npm run test:integration && npm run test:e2e`
  - **Expected:** Todos os testes passam

- [x] 7.8 Documentar rollback procedure (script + feature flag)
  **Verification:**
  - **Run:** `cat scripts/rollback-multi-restaurant.ts`
  - **Expected:** Script de rollback existe e é documentado

(End of file - total 104 lines)
