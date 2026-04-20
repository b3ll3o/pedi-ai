# SDD Archive Report: Cardápio Digital

**Archive Date**: 2026-04-20
**Change ID**: cardapio-digital
**Pipeline**: full
**Persistence**: hybrid

---

## Summary

Cardápio Digital is a full-featured restaurant management platform enabling customers to browse menus and place orders via QR code, while restaurant staff manage orders and the menu catalog through an administrative panel. The system prioritizes offline-first operation for reliability in environments with poor connectivity.

**Implementation Status**: PARTIAL (phases 1-2 complete, phase 3 partial)

---

## What Was Implemented

### Phase 1: Infrastructure (100% — 14/14 tasks)
- Next.js 14+ project with TypeScript, pnpm workspaces, Turborepo monorepo
- Vitest unit testing setup with 80% coverage threshold
- Supabase project configuration with Auth, Postgres, Realtime
- Supabase TypeScript types for all 12 tables + 4 enums
- 15 SQL migrations with full schema (restaurants, tables, categories, products, modifier_groups, modifier_values, combos, combo_items, orders, order_items, order_status_history, users_profiles)
- 45 RLS policies for tenant isolation
- IndexedDB with Dexie (4 tables: cart, menu_cache, pending_sync, tables_info)
- Service Worker with Workbox (precaching, runtime cache, background sync)
- ReactQuery + Zustand providers in root layout
- PWA manifest and metadata
- 8 feature flags (NEXT_PUBLIC_FEATURE_*)

### Phase 2: Customer Flow (100% — 39/39 tasks)
**Menu Domain**:
- `GET /api/menu` endpoint with full menu data
- `useMenu` hook with React Query (5min stale time)
- `CategoryList`, `CategoryCard`, `ProductList`, `ProductCard`, `ProductDetail` components
- `DietaryFilter` with 6 Portuguese filter chips
- `menuStore` (Zustand + immer) with dietary AND filtering and search
- Menu pages: `(customer)/menu/page.tsx`, `(customer)/menu/[categoryId]/page.tsx`, `(customer)/product/[productId]/page.tsx`

**QR/Table Domain**:
- HMAC-SHA256 QR signature generation (`lib/qr/generator.ts`)
- QR signature validation with timing-safe comparison and 24h expiry (`lib/qr/validator.ts`)
- `POST /api/tables/validate` endpoint
- `useTable` hook and Zustand table store with 24h context persistence
- Table identification flow with restaurant/table context

**Cart Domain**:
- `cartStore` (Zustand + immer) with add/remove/update/clear operations
- IndexedDB persistence via subscribe middleware
- `CartBadge`, `CartDrawer`, `CartItem`, `CartSummary`, `ModifierSelector` components
- Combo item handling with bundle pricing
- `POST /api/cart/validate` endpoint with 5 validation rules
- BroadcastChannel API for multi-tab cart sync
- Cart page `(customer)/cart/page.tsx`

**Checkout & Order Domain**:
- `POST /api/orders` endpoint with idempotency key
- `GET /api/orders/[id]` endpoint
- Guest checkout flow (session-based identifier)
- `CheckoutForm`, `PaymentMethodSelector` components
- Order confirmation pages and components

**Payment Domain (Pix + Stripe)**:
- `POST /api/payments/pix/create` endpoint
- `PixQRCode` component with loading/ready/expired/paid states
- Pix payment polling (every 3 seconds)
- `GET /api/payments/pix/status/[orderId]` endpoint
- `POST /api/payments/stripe/create-intent` endpoint
- `StripeCardForm` with Stripe Elements
- `POST /api/payments/stripe/webhook` endpoint
- Webhook idempotency via `idempotency_key` column
- Webhook signature validation
- 60-second payment timeout handling

### Phase 3: Admin + Waiter (PARTIAL — ~54%)

**Auth Domain (100% — 10/10 tasks)**:
- Supabase Auth integration with email/password
- `LoginForm`, `ProtectedRoute` components
- `useAuth` hook with session management
- `useRole` hook for RBAC (owner, manager, staff)
- Admin login page `(admin)/login/page.tsx`
- Password reset flow via Supabase Auth
- 26 unit tests for auth flow

**Category CRUD (100% — 7/7 tasks)**:
- Full CRUD endpoints for `/api/admin/categories`
- `CategoryForm` component with drag-reorder support
- Category list and edit pages
- Soft-delete via `active=false`
- 15 unit tests

**Product CRUD (100% — 8/8 tasks)**:
- Full CRUD endpoints for `/api/admin/products`
- `ProductForm` with image upload to Supabase Storage
- Product list with search/filter
- Dietary labels array storage
- Soft-delete via `active=false`
- 23 unit tests

**Modifier CRUD (100% — 5/5 tasks)**:
- CRUD endpoints for modifier_groups and modifier_values
- `ModifierGroupForm` with inline value editing
- Required/min/max selection enforcement in frontend
- 39 unit tests

**Combo CRUD (100% — 4/4 tasks)**:
- CRUD endpoints for `/api/admin/combos`
- `ComboForm` with bundle pricing
- `combo_items` junction table management
- 27 unit tests

**Table Management**:
- `GET/POST /api/admin/tables` endpoints implemented
- `PUT /api/admin/tables/[id]` endpoint implemented
- `TableManagement` component (partial)
- `useTable` hook for admin table context
- Table QR generation via `tableService.ts` (HMAC signature only — PNG download NOT implemented)

**NOT Implemented**:
- QR download as PNG (`TableQRCode` component missing)
- `GET /api/admin/orders` endpoint (order list with filters)
- Admin order detail pages
- Analytics API (`GET /api/admin/analytics`)
- Kitchen display component (`KitchenDisplay`)
- Waiter dashboard (`WaiterDashboard`, `OrderNotification`)
- `useWaiterOrders` hook (empty implementation, no realtime)
- User invitation/role assignment UI (UserManagement component missing)
- 10-second polling fallback for realtime

### Phase 4: Offline + Polish (0% — 0/30 tasks)
NOT implemented:
- Background sync for pending orders
- Service Worker Background Sync event registration
- `pending_sync` queue in IndexedDB
- Sync failure exponential backoff
- Manual retry button after 3 failures
- `OfflineIndicator` component (exists in layout but no implementation)
- `SyncStatus` component
- Reconnection toast
- Cache invalidation on admin save

### Phase 5: E2E Tests (0% — 0/25 tasks)
- Test files exist (12 spec files across customer/admin/waiter)
- Cannot execute without Playwright installation
- No CI workflow configured

---

## Files Created/Modified

### Implementation Files (selected key files)

**Infrastructure**:
- `apps/web/package.json`, `pnpm-workspace.yaml`, `turbo.json`
- `apps/web/vitest.config.ts`
- `apps/web/src/lib/supabase/{client,server,types,auth}.ts`
- `apps/web/src/lib/offline/{db,sync,cache}.ts`
- `apps/web/src/lib/qr/{generator,validator}.ts`
- `apps/web/public/sw.js`, `manifest.json`

**Customer Flow**:
- `apps/web/src/app/(customer)/menu/page.tsx`
- `apps/web/src/app/(customer)/menu/[categoryId]/page.tsx`
- `apps/web/src/app/(customer)/product/[productId]/page.tsx`
- `apps/web/src/app/(customer)/cart/page.tsx`
- `apps/web/src/app/(customer)/checkout/page.tsx`
- `apps/web/src/app/(customer)/order/[orderId]/page.tsx`
- `apps/web/src/components/{menu,cart,checkout,order,payment,table}/*`
- `apps/web/src/hooks/{useMenu,useCart,useOrders,useTable}.ts`
- `apps/web/src/stores/{menuStore,cartStore,orderStore}.ts`
- `apps/web/src/services/{orderService,paymentService,tableService}.ts`

**Admin Flow**:
- `apps/web/src/app/(admin)/login/page.tsx`
- `apps/web/src/app/(admin)/dashboard/page.tsx`
- `apps/web/src/app/(admin)/categories/{page,[id]/page}.tsx`
- `apps/web/src/app/(admin)/products/{page,[id]/page}.tsx`
- `apps/web/src/app/(admin)/modifiers/page.tsx`
- `apps/web/src/app/(admin)/combos/page.tsx`
- `apps/web/src/components/admin/{AdminLayout,LoginForm,ProtectedRoute,CategoryForm,ProductForm,ModifierGroupForm,ComboForm}.tsx`

**API Routes**:
- `apps/web/src/app/api/menu/route.ts`
- `apps/web/src/app/api/menu/products/[id]/route.ts`
- `apps/web/src/app/api/tables/validate/route.ts`
- `apps/web/src/app/api/orders/route.ts`
- `apps/web/src/app/api/orders/[id]/route.ts`
- `apps/web/src/app/api/cart/validate/route.ts`
- `apps/web/src/app/api/payments/pix/{create,status}/route.ts`
- `apps/web/src/app/api/payments/stripe/{create-intent,webhook}/route.ts`
- `apps/web/src/app/api/admin/categories/*/route.ts`
- `apps/web/src/app/api/admin/products/*/route.ts`
- `apps/web/src/app/api/admin/modifiers/*/route.ts`
- `apps/web/src/app/api/admin/combos/*/route.ts`
- `apps/web/src/app/api/admin/tables/*/route.ts`

**Database**:
- `supabase/migrations/` — 15 migration files
- `supabase/config.toml`

**Tests**:
- `apps/web/src/tests/unit/` — 19 test files
- `apps/e2e/tests/` — 12 spec files (not executable)

---

## Test Coverage Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Statements | ≥80% | Unknown | ⚠️ Cannot measure (deps not installed) |
| Branches | ≥80% | Unknown | ⚠️ Cannot measure |
| Functions | ≥80% | Unknown | ⚠️ Cannot measure |
| Lines | ≥80% | Unknown | ⚠️ Cannot measure |

**Unit Test Files**: 19 (services, stores, hooks, lib)
**E2E Spec Files**: 12 (customer, admin, waiter)
**Note**: Cannot execute tests without `pnpm install`

---

## Verification Summary

**Verification Status**: PARTIAL
- Phases 1-2: Fully implemented and verified (file inspection + spec scenario mapping)
- Phase 3: Auth, Category, Product, Modifier, Combo CRUD complete (~54%)
- Phase 3: Table QR download, Order Management, Kitchen/Waiter, Analytics, User Management NOT implemented
- Phase 4: Entirely missing (Background Sync, OfflineIndicator, SyncStatus)
- Phase 5: Cannot execute (Playwright not installed)

**Critical Gaps**:
1. No Kitchen Display — `KitchenDisplay` component not implemented
2. No Waiter Dashboard — realtime order notifications not implemented
3. No Realtime Subscriptions — Supabase Realtime not integrated for order updates
4. No Order Management API — `GET /api/admin/orders` endpoint missing
5. No Background Sync — offline order queue not synced via Service Worker
6. No OfflineIndicator component — no UI for offline status

**High Priority Gaps**:
1. No QR Download — `TableQRCode` component with PNG export missing
2. No Order Cancel/Refund — cancellation and refund flow not implemented
3. No Analytics API — `GET /api/admin/analytics` not implemented
4. No Staff User Management — user invitation/role assignment UI missing

---

## Main Specs Location

All 8 domain specs merged to `openspec/specs/{domain}/spec.md`:
- `openspec/specs/menu/spec.md`
- `openspec/specs/cart/spec.md`
- `openspec/specs/order/spec.md`
- `openspec/specs/payment/spec.md`
- `openspec/specs/table/spec.md`
- `openspec/specs/admin/spec.md`
- `openspec/specs/auth/spec.md`
- `openspec/specs/offline/spec.md`

---

## Archive Location

Original change artifacts preserved at:
`openspec/changes/archive/2026-04-20-cardapio-digital/`

Contains: `proposal.md`, `design.md`, `tasks.md`, `verify-report.md`, `specs/*/spec.md`

---

*Archive completed 2026-04-20*