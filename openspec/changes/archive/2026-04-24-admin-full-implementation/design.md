# Design: Admin Full Implementation

## Technical Approach

### Overview
Implementar o painel administrativo completo do Pedi-AI seguindo o padrão RESTful existente no codebase, com foco em:
1. Middleware de autenticação para proteger rotas `/admin/*`
2. Validação server-side de roles e restaurant_id
3. Integração de APIs existentes com UI stubs
4. CRUD operations com soft-delete pattern

### Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth com SSR cookies
- **API**: App Router API Routes (`/src/app/api/admin/*`)
- **State**: React Server Components + Client Components onde necessário

---

## Architecture Decisions

### Decision: Middleware Location
**Choice**: Criar `src/middleware.ts` na raiz do projeto
**Alternatives considered**:
- Usar `src/lib/supabase/middleware.ts` existente
- Implementar verificação em cada API route
**Rationale**: O middleware existente em `src/lib/supabase/middleware.ts` é para SSR do Supabase, não para proteção de rotas admin. Precisamos de um middleware na raiz que intercepte todas as requisições `/admin/*` e `/api/admin/*`.

### Decision: Restaurant ID Context
**Choice**: Extrair `restaurant_id` do JWT claims ou da tabela `users` via `getSession()`
**Alternatives considered**:
- Passar `restaurant_id` no body de todas as requisições
- Usar `restaurant_id` do JWT custom claims
**Rationale**: O JWT do Supabase não suporta custom claims facilmente na versão gratuita. A abordagem mais robusta é fazer `getSession()` e consultar a tabela `users` para obter o `restaurant_id` do usuário autenticado.

### Decision: RBAC Implementation
**Choice**: Verificação em cada API route via helper function `requireRole()`
**Alternatives considered**:
- Middleware centralizado com role verification
- Supabase Row Level Security (RLS)
**Rationale**: RLS é insuficiente para casos complexos (owner vs manager vs staff com permissões granulares). Helper function permite validação granular por endpoint.

### Decision: Soft Delete Pattern
**Choice**: Usar `deleted_at` timestamp (não `is_active` boolean)
**Alternatives considered**:
- `is_active` boolean
- Hard delete com archival table
**Rationale**: O padrão existente no codebase já usa `deleted_at`. Mantém consistência e permite auditoria.

### Decision: URL Structure
**Choice**: Usar rotas em português para UI admin (`/admin/pedidos`, `/admin/cardapio`)
**Alternatives considered**:
- Manter em inglês (`/admin/orders`, `/admin/menu`)
**Rationale**: O projeto segue convenção pt-BR para UI. Manter consistência com，其他的 admin routes.

### Decision: API Response Format
**Choice**: Padronizar `{ data: T }` para sucesso e `{ error: string }` para erros
**Alternatives considered**:
- Retornar diretamente o recurso
- Usar discriminated unions
**Rationale**: Padrão já utilizado no codebase. Consistente e fácil de usar no client.

---

## Data Flow

### Authentication Flow
```
1. User accesses /admin/login
2. Form submits credentials to /api/auth/login (Supabase Auth)
3. Supabase creates session cookie
4. User redirected to /admin/dashboard
5. Subsequent requests to /api/admin/* include session cookie
6. Middleware validates session via createClient(request)
```

### RBAC Flow
```
1. API route receives request
2. Route calls requireAuth() helper
3. Helper calls getSession() to get user
4. Helper queries users table to get role and restaurant_id
5. Helper calls requireRole(userRole, allowedRoles)
6. If authorized, route proceeds with restaurant_id from user session
7. If unauthorized, returns 403 Forbidden
```

### Restaurant Context Flow
```
1. Authenticated user makes request to /api/admin/categories
2. Middleware validates session (redirects if invalid)
3. API route calls getSession() → get user ID
4. Route queries users table WHERE id = userId → get restaurant_id
5. All database queries include WHERE restaurant_id = X
6. Response filtered by restaurant context
```

### CRUD Flow (Example: Create Category)
```
1. Admin fills category form in UI
2. Client sends POST /api/admin/categories with { name, description, display_order }
3. Middleware validates session
4. API handler:
   a. Calls getSession() → gets user
   b. Queries user role from users table
   c. Validates user has 'owner' or 'manager' role
   d. Gets restaurant_id from user record
   e. INSERT into categories with restaurant_id
   f. Returns created category
5. UI updates list via revalidatePath()
```

---

## File Changes

### New Files to Create
```
src/
├── middleware.ts                          # Admin route protection
├── app/api/admin/categories/route.ts      # CRUD categories (replace stub)
├── app/api/admin/categories/[id]/route.ts # Single category CRUD
├── app/api/admin/categories/reorder/route.ts # Batch reorder
├── app/api/admin/products/route.ts        # CRUD products (replace stub)
├── app/api/admin/products/[id]/route.ts   # Single product CRUD
├── app/api/admin/modifiers/route.ts       # CRUD modifiers
├── app/api/admin/modifiers/[id]/route.ts  # Single modifier CRUD
├── app/api/admin/combos/route.ts          # CRUD combos
├── app/api/admin/combos/[id]/route.ts    # Single combo CRUD
├── app/api/admin/orders/route.ts          # List orders with filters (enhance)
├── app/api/admin/orders/[id]/route.ts    # Order detail + status update
├── app/api/admin/tables/route.ts          # CRUD tables
├── app/api/admin/tables/[id]/route.ts    # Single table CRUD
├── app/api/admin/users/route.ts           # List users
├── app/api/admin/users/[id]/route.ts     # User detail + role update
├── app/api/admin/analytics/route.ts      # Analytics dashboard data
├── app/api/admin/settings/route.ts       # Restaurant settings
├── lib/auth/
│   ├── admin.ts                          # requireAuth, requireRole helpers
│   └── restaurant.ts                     # getRestaurantId helper
├── components/admin/
│   ├── CategoryForm.tsx                   # Integrate with API (enhance existing)
│   ├── ProductForm.tsx                    # Integrate with API
│   ├── ModifierForm.tsx                   # New/replace stub
│   ├── ComboForm.tsx                      # Integrate with API
│   ├── OrderList.tsx                      # Integrate with filters
│   ├── OrderDetailAdmin.tsx               # Add status update
│   ├── TableManagement.tsx                 # Integrate with API
│   ├── UserManagement.tsx                 # New component
│   ├── AnalyticsDashboard.tsx              # Integrate with API
│   └── SettingsPage.tsx                   # New component
└── app/admin/
    ├── configuracoes/page.tsx            # NEW page (currently missing)
    ├── categorias/page.tsx                # Point to correct component
    ├── produtos/page.tsx                  # Point to correct component
    └── PedidosPage implementation (currently mismatched)
```

### Files to Modify
```
src/
├── middleware.ts                          # Create with auth logic
├── existing API routes in /api/admin/    # Add requireAuth + requireRole
├── app/admin/pedidos/page.tsx            # Fix URL mismatch
├── app/admin/dashboard/page.tsx          # Use AdminLayout
├── app/admin/layout.tsx (AdminLayout)    # Fix URL links
└── components/admin/AdminLayout.tsx      # Fix navigation links
```

### Files to Delete
```
Nenhum - manter UI stubs existentes até substituídos
```

---

## Interfaces / Contracts

### API Response Types
```typescript
// Success
interface ApiSuccess<T> {
  data: T
}

// Error
interface ApiError {
  error: string
  details?: Record<string, string[]> // Zod validation errors
}

// Paginated
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

### Auth Helpers
```typescript
// src/lib/auth/admin.ts
interface AuthUser {
  id: string
  email: string
  role: 'owner' | 'manager' | 'staff'
  restaurant_id: string
}

function requireAuth(): Promise<AuthUser>
function requireRole(user: AuthUser, allowedRoles: Role[]): void
```

### Database Types (already exist in src/lib/supabase/types.ts)
```typescript
interface Category {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Product {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  dietary_labels: string[]
  is_active: boolean
  // ...
}
```

---

## Testing Strategy

### Unit Tests (Vitest)
- `lib/auth/admin.ts`: Test requireAuth, requireRole
- `services/adminOrderService.ts`: Test status transitions
- CRUD operations via mocked Supabase client

### Integration Tests
- API routes with test Supabase instance
- Auth flow: login → protected route → logout
- RBAC: verify each role gets correct access/denial

### E2E Tests (Playwright)
- Admin login flow
- CRUD operations for each entity (category, product, order, table)
- RBAC: login as each role, verify navigation and API access
- Analytics dashboard renders correctly

### Test Files Location
```
tests/
├── unit/
│   └── lib/auth/admin.test.ts
├── integration/
│   └── app/api/admin/categories.test.ts
└── e2e/
    └── admin/
        ├── login.spec.ts
        ├── categories.spec.ts
        ├── products.spec.ts
        ├── orders.spec.ts
        └── rbac.spec.ts
```

---

## Migration / Rollback

### Phase 1 Migration (Authentication + RBAC)
1. Create `src/middleware.ts`
2. Deploy with feature flag `ADMIN_AUTH_ENABLED=false`
3. Test middleware in staging
4. Enable flag in production
5. **Rollback**: Set flag to `false`

### Phase 2 Migration (CRUD APIs)
1. Implement category CRUD APIs
2. Deploy
3. Integrate UI
4. **Rollback**: Revert API changes, UI shows errors

### Phase 3 Migration (Remaining Features)
- Tables, Orders, Analytics, Settings
- Same pattern: API first → UI integration

### Database Migration
- No schema changes required (structure already supports all features)
- Soft-delete using existing `deleted_at` column

---

## Open Questions

1. **QR Code Storage**: QR codes são gerados on-the-fly ou armazenados? Atualmente parece ser gerado via `qr/generator.ts`.

2. **Combo Bundle Pricing**: O `orderService.ts` já calcula bundle price ou precisa de modificação?

3. **Settings Page**: Quais configurações exatamente? (Nome do restaurante, horário de funcionamento, etc.)

4. **Analytics Period**: Qual granularidade 默认? dia/semana/mês?

5. **Feature Flags**: Devemos usar o sistema existente em `lib/feature-flags.ts`?

6. **Real-time Updates**: Usa Supabase Realtime para dashboards admin ou polling?

---

## Implementation Priority (per Proposal)

```
Phase 1 - Core (Pedidos + Cardápio)
├── 1. Middleware de autenticação
├── 2. Helper functions (requireAuth, requireRole, getRestaurantId)
├── 3. APIs de Categorias (CRUD + reorder)
├── 4. APIs de Produtos (CRUD)
├── 5. APIs de Modifiers (CRUD)
├── 6. APIs de Combos (CRUD)
├── 7. UI de Categorias (integrada)
├── 8. UI de Produtos (integrada)
├── 9. UI de Modifiers/Combos
└── 10. UI de Pedidos (listagem + detalhes)

Phase 2 - Infrastructure
├── 11. Sistema de Roles (validar em todas APIs)
├── 12. Corrigir restaurant_id dinâmico
└── 13. Corrigir URLs AdminLayout

Phase 3 - Completude
├── 14. CRUD Mesas + QR
├── 15. CRUD Usuários
├── 16. Analytics Dashboard
└── 17. Página Configurações
```