# Tasks: Cardápio Digital

## Phase 1: Infrastructure
- [x] 1.1 Initialize Next.js 14 project with TypeScript and App Router in `apps/web/`
  **Verification:**
  - Run: `ls apps/web/src/app/page.tsx && cat apps/web/package.json`
  - Expected: `page.tsx` exists; `package.json` shows `"next": ">=14"` and `"typescript": "*"`
  **Result**: Completed with Next.js 16.2.4 (latest), React 19.2.4, TypeScript 5 (strict mode), ESLint, Prettier

- [x] 1.2 Configure workspace structure with Turbo monorepo (`apps/web`, `apps/e2e`, `packages/shared`)
  **Verification:**
  - Run: `ls -d apps/* packages/* && cat package.json`
  - Expected: `apps/web`, `apps/e2e`, `packages/shared` directories exist; `package.json` contains `"workspaces": ["apps/*", "packages/*"]`
  **Result**: Completed with pnpm workspaces + Turborepo 2.x. **Nota**: apps/e2e usa Playwright nativo (sem Cucumber)

- [x] 1.3 Configure Vitest with TypeScript and coverage thresholds (≥80%)
  **Verification:**
  - Run: `cat apps/web/vitest.config.ts | grep -E 'coverage|threshold'`
  - Expected: Coverage thresholds set to ≥80% for statements, branches, functions, lines
  **Result**: Completed with Vitest 4.1.4, @testing-library/react 16.3.2, 80% thresholds configured

- [x] 1.4 Set up Supabase project and retrieve environment variables
  **Verification:**
  - Run: `ls apps/web/.env.local.example && grep SUPABASE apps/web/.env.local.example`
  - Expected: `.env.local.example` contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  **Result**: Completed with env template, supabase/config.toml, and SUPABASE_SETUP.md

- [x] 1.5 Create Supabase client in `apps/web/src/lib/supabase/client.ts` and `server.ts`
  **Verification:**
  - Run: `ls apps/web/src/lib/supabase/client.ts apps/web/src/lib/supabase/server.ts`
  - Expected: Both files exist and export Supabase client instances
  **Result**: Completed with @supabase/ssr (createBrowserClient, createServerClient, middleware)

- [x] 1.6 Generate Supabase TypeScript types in `apps/web/src/lib/supabase/types.ts`
  **Verification:**
  - Run: `head -20 apps/web/src/lib/supabase/types.ts`
  - Expected: File contains generated types for restaurants, tables, categories, products, orders, etc.
  **Result**: Completed — 12 table types + 4 enums + Database type + realtime types

- [x] 1.7 Run initial database migrations for all tables (restaurants, tables, categories, products, modifier_groups, modifier_values, combos, combo_items, orders, order_items, order_status_history, users_profiles)
  **Verification:**
  - Run: `ls supabase/migrations/*.sql | wc -l && grep -c 'CREATE TABLE' supabase/migrations/*.sql`
  - Expected: At least 12 migration files; at least 12 CREATE TABLE statements
  **Result**: Completed — 12 migration files with all tables, UUID PKs, FKs, indexes, comments, timestamps

- [x] 1.8 Configure Supabase RLS policies for tenant isolation on all tables
  **Verification:**
  - Run: `grep -l 'ENABLE ROW LEVEL SECURITY' supabase/migrations/*.sql && grep -c 'CREATE POLICY' supabase/migrations/*.sql`
  - Expected: RLS enabled on all tables; at least 12 policies created
  **Result**: Completed — 12 RLS enabled + 45 policies (SELECT/INSERT/UPDATE/DELETE) with tenant isolation

- [x] 1.9 Set up IndexedDB with Dexie in `apps/web/src/lib/offline/db.ts`
  **Verification:**
  - Run: `cat apps/web/src/lib/offline/db.ts | grep -E 'class|version|table'`
  - Expected: Dexie class defined with version; tables for cart, menu_cache, pending_sync
  **Result**: Completed with Dexie 4.x, 4 tables (cart, menu_cache, pending_sync, tables_info)

- [x] 1.10 Register Service Worker with Workbox in `apps/web/public/sw.js`
  **Verification:**
  - Run: `cat apps/web/public/sw.js | head -30`
  - Expected: Workbox import statements present; SW registers without errors in browser console
  **Result**: Completed with Workbox 7.x, precaching, runtime cache, background sync configured

- [x] 1.11 Implement application shell caching strategy (cache-first for static assets)
  **Verification:**
  - Run: `grep -E 'cacheFirst|cache-first|StaleWhileRevalidate' apps/web/public/sw.js`
  - Expected: At least one cacheFirst or StaleWhileRevalidate strategy defined for static assets
  **Result**: Completed with Workbox strategies: CacheFirst (static), NetworkFirst (API), StaleWhileRevalidate, Google Fonts

- [x] 1.12 Create root layout with providers (`ReactQueryProvider`, `ZustandProvider`) in `apps/web/src/app/layout.tsx`
  **Verification:**
  - Run: `grep -E 'ReactQueryProvider|ZustandProvider|children' apps/web/src/app/layout.tsx`
  - Expected: Layout wraps children with both providers; no TypeScript errors on `pnpm build`
  **Result**: Completed — ReactQueryProvider (@tanstack/react-query 5), Zustand 5, SW registration, OfflineIndicator, PWA metadata

- [x] 1.13 Configure feature flags (`NEXT_PUBLIC_FEATURE_*`) in environment
  **Verification:**
  - Run: `grep 'NEXT_PUBLIC_FEATURE_' apps/web/.env.local.example`
  - Expected: Flags for OFFLINE_ENABLED, PIX_ENABLED, STRIPE_ENABLED, WAITER_MODE all present
  **Result**: Completed with 8 feature flags in .env.local.example + feature-flags.ts helpers + features.ts config

- [x] 1.14 Write unit tests for IndexedDB operations (`apps/web/src/tests/unit/lib/offline.test.ts`)
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/unit/lib/offline.test.ts`
  - Expected: All tests pass; coverage report generated
  **Result**: Completed — 20 test cases for cart, menu_cache, pending_sync, tables_info operations

## Phase 2: Customer Flow

### 2.1 Menu Browsing
- [x] 2.1.1 Create `GET /api/menu` endpoint returning all categories, products, modifier groups, and modifier values
  **Result**: Completed — GET /api/menu route with typed MenuResponse, Supabase queries, error handling

- [x] 2.1.2 Implement `useMenu` hook with React Query for menu data fetching
  **Result**: Completed — useMenu(restaurantId) hook, queryKey ['menu', restaurantId], 5min stale time

- [x] 2.1.3 Build `CategoryList` component with loading and empty states
  **Result**: Completed — skeleton cards (6), empty state, responsive grid, fade-in animation

- [x] 2.1.4 Build `CategoryCard` component with image, name, and description
  **Result**: Completed — next/image, gradient placeholder, hover/active states, accessibility

- [x] 2.1.5 Build `ProductList` component with loading, empty, and filtered states
  **Result**: Completed — category filtering, 6 skeleton cards, responsive 2/3/4 col grid

- [x] 2.1.6 Build `ProductCard` component with image, name, price, and dietary labels
  **Result**: Completed — next/image, BRL formatting, dietary badges (9 types), "Esgotado" overlay

- [x] 2.1.7 Create `GET /api/menu/products/[id]` endpoint for product detail
  **Result**: Completed — GET /api/menu/products/[id] with category join, modifier_groups, modifier_values

- [x] 2.1.8 Build `ProductDetail` component with full product view
  **Result**: Completed — React Query fetch, quantity selector, modifier placeholder, dietary badges, add to cart

- [x] 2.1.9 Build `DietaryFilter` component with chip toggles (vegan, gluten-free, etc.)
  **Result**: Completed — 6 filter chips with Portuguese labels, toggle behavior, distinct colors

- [x] 2.1.10 Implement dietary filtering logic in `menuStore`
  **Result**: Completed — Zustand 5 + immer, dietary AND logic, search by name

- [x] 2.1.11 Implement product search by name across all categories
  **Result**: Completed — SearchBar with debounce, integrates with menuStore, global search

- [x] 2.1.12 Create menu page `apps/web/src/app/(customer)/menu/page.tsx`
  **Result**: Completed — Header, SearchBar, DietaryFilter, CategoryList, menuStore sync

- [x] 2.1.13 Create category page `apps/web/src/app/(customer)/menu/[categoryId]/page.tsx`
  **Result**: Completed — breadcrumb, category header, ProductList filtered by category, search

- [x] 2.1.14 Create product detail page `apps/web/src/app/(customer)/product/[productId]/page.tsx`
  **Result**: Completed — ProductDetail, add-to-cart, toast, cart modal, cartStore created

- [x] 2.1.15 Write unit tests for `menuStore` filtering and search logic
  **Result**: Completed — 29 tests covering dietary, search, category filter, clearFilters

- [x] 2.1.16 Write unit tests for `useMenu` hook
  **Result**: Completed — 9 tests covering fetch, error, query key, stale time

### 2.2 QR Code Table Identification
- [x] 2.2.1 Implement QR signature generation (HMAC-SHA256) in `apps/web/src/lib/qr/generator.ts`
  **Result**: Completed — HMAC-SHA256 generator with restaurant_id:table_id:timestamp

- [x] 2.2.2 Implement QR signature validation in `apps/web/src/lib/qr/validator.ts`
  **Result**: Completed — validates signature, timestamp (24h expiry), timing-safe comparison

- [x] 2.2.3 Create `POST /api/tables/validate` endpoint to validate QR payload
  **Result**: Completed — /api/tables/validate with signature validation and table lookup

- [x] 2.2.4 Build `useTable` hook to manage table context from QR scan
  **Result**: Completed — useTable with setTable, validateTable, clearTable

- [x] 2.2.5 Implement table context storage in Zustand store
  **Result**: Completed — Zustand persist, 24h expiry, setTable/setValid/clearTable

- [x] 2.2.6 Write unit tests for QR generator and validator
  **Result**: Completed — 13 tests covering generator, validator, expiry, wrong signature/secret

### 2.3 Cart Management
- [x] 2.3.1 Create `cartStore` in Zustand with add/remove/update/clear operations
  **Result**: Completed — Zustand 5 + immer, all operations, selectors

- [x] 2.3.2 Implement cart persistence to IndexedDB on every mutation
  **Result**: Completed — subscribe middleware, hydrateCartFromIndexedDB on mount

- [x] 2.3.3 Build `CartBadge` component with floating item count
  **Result**: Completed — floating badge, pulse animation, click opens cart

- [x] 2.3.4 Build `CartDrawer` slide-in component with cart items
  **Result**: Completed — slide-in from right, backdrop, CartItem list, CartSummary

- [x] 2.3.5 Build `CartItem` component with quantity controls
  **Result**: Completed — +/- buttons, modifiers, remove, price display

- [x] 2.3.6 Build `CartSummary` component with subtotal and total calculations
  **Result**: Completed — subtotal, tax, total, checkout button

- [x] 2.3.7 Build `ModifierSelector` component for required/optional modifier selection
  **Result**: Completed — min/max enforcement, price adjustments, radio/checkbox

- [x] 2.3.8 Implement combo item handling in cart (bundle pricing)
  **Result**: Completed — comboItems, bundlePrice, getTotalPrice handles combos

- [x] 2.3.9 Implement cart validation (product availability, price consistency)
  **Result**: Completed — /api/cart/validate with 5 validation rules

- [x] 2.3.10 Create cart page `apps/web/src/app/(customer)/cart/page.tsx`
  **Result**: Completed — full cart page with items, summary, checkout CTA

- [x] 2.3.11 Implement BroadcastChannel API for multi-tab cart sync
  **Result**: Completed — BroadcastChannel sync, echo prevention, cleanup

- [x] 2.3.12 Write unit tests for `cartStore` operations and price calculations
  **Result**: Completed — 15 tests covering all operations and selectors

- [x] 2.3.13 Write integration tests for IndexedDB cart persistence
  **Result**: Completed — 5 tests with fake-indexeddb polyfill

### 2.4 Checkout and Order Creation
- [x] 2.4.1 Create `POST /api/orders` endpoint to create orders
- [x] 2.4.2 Implement idempotency key generation from cart hash + timestamp
- [x] 2.4.3 Create `GET /api/orders/[id]` endpoint for order retrieval
- [x] 2.4.4 Build `CheckoutForm` component with order review
- [x] 2.4.5 Build `PaymentMethodSelector` component (Pix / Card toggle)
- [x] 2.4.6 Implement guest checkout flow (session-based identifier)
- [x] 2.4.7 Create checkout page `apps/web/src/app/(customer)/checkout/page.tsx`
- [x] 2.4.8 Implement order creation from cart with `orderService`
- [x] 2.4.9 Write unit tests for `orderService` order creation

### 2.5 Payment Integration
- [x] 2.5.1 Create `POST /api/payments/pix/create` endpoint for Pix charge creation
- [x] 2.5.2 Build `PixQRCode` component with loading, ready, expired, paid states
- [x] 2.5.3 Implement Pix payment polling (every 3 seconds)
- [x] 2.5.4 Create `GET /api/payments/pix/status/[orderId]` endpoint
- [x] 2.5.5 Create Supabase Edge Function `pix-webhook` for Mercado Pago callbacks
- [x] 2.5.6 Implement webhook signature validation for Pix
- [x] 2.5.7 Create `POST /api/payments/stripe/create-intent` endpoint
- [x] 2.5.8 Build `StripeCardForm` component with Stripe Elements
- [x] 2.5.9 Create `POST /api/payments/stripe/webhook` endpoint
- [x] 2.5.10 Implement webhook idempotency check to prevent duplicate processing
- [x] 2.5.11 Create `PaymentStatus` component showing payment states
- [x] 2.5.12 Implement payment timeout handling (60 seconds for Pix)
- [x] 2.5.13 Write unit tests for `paymentService` (Pix/Stripe payload creation)
- [x] 2.5.14 Write integration tests for payment webhook handlers

### 2.6 Order Confirmation and History
- [x] 2.6.1 Build `OrderConfirmation` component with order ID and estimated time
- [x] 2.6.2 Build `OrderStatus` component with real-time status updates
- [x] 2.6.3 Build `OrderHistory` component for past orders list
- [x] 2.6.4 Build `OrderDetail` component with items, modifiers, and status history
- [x] 2.6.5 Create order confirmation page `apps/web/src/app/(customer)/order/[orderId]/page.tsx`
- [x] 2.6.6 Implement reorder functionality (add past order items to cart)
- [x] 2.6.7 Write unit tests for order status transitions

## Phase 3: Admin + Waiter

### 3.1 Admin Authentication
- [x] 3.1.1-3.1.10 Admin Authentication (all 10 tasks)
  **Result**: auth.ts, LoginForm, ProtectedRoute, login page, useAuth, useRole, AdminLayout, session expiry, password reset, 26 tests

### 3.2 Category CRUD
- [x] 3.2.1-3.2.7 All Category CRUD tasks
  **Result**: CRUD endpoints, CategoryForm, CategoryList drag-reorder, soft-delete, pages, 15 tests

### 3.3 Product CRUD
- [x] 3.3.1-3.3.8 All Product CRUD tasks
  **Result**: CRUD endpoints, ProductForm with image upload, ProductList search/filter, soft-delete, pages, 23 tests

### 3.4 Modifier Group and Value CRUD
- [x] 3.4.1-3.4.5 All Modifier CRUD tasks
  **Result**: CRUD endpoints, ModifierGroupForm with values, modifiers page, 39 tests

### 3.5 Combo CRUD
- [x] 3.5.1-3.5.4 All Combo CRUD tasks
  **Result**: CRUD endpoints, ComboForm with bundle pricing, combos page, 27 tests

### 3.6 Table Management and QR Generation
- [~] 3.6.1 Create `CRUD /api/admin/tables/*` endpoints

- [ ] 3.6.2 Implement table QR code generation with HMAC signature
  **Verification:**
  - Run: `grep -E 'generateQR|signature|qr_code' apps/web/src/services/tableService.ts`
  - Expected: QR contains restaurant_id, table_id, timestamp, and HMAC signature

- [ ] 3.6.3 Build `TableManagement` component with QR download
  **Verification:**
  - Run: `cat apps/web/src/components/admin/TableManagement.tsx | grep -E 'QRCode|download|print'`
  - Expected: Component displays QR code with download/print button

- [ ] 3.6.4 Build `TableQRCode` component for display and download
  **Verification:**
  - Run: `cat apps/web/src/components/table/TableQRCode.tsx | grep -E 'canvas|blob|download'`
  - Expected: Renders QR as canvas; exports as PNG for download

- [ ] 3.6.5 Create tables page `apps/web/src/app/(admin)/tables/page.tsx`
  **Verification:**
  - Run: `cat apps/web/src/app/\(admin\)/tables/page.tsx | grep -E 'TableManagement|tables'`
  - Expected: Page lists tables with QR generation UI

- [ ] 3.6.6 Create table edit page `apps/web/src/app/(admin)/tables/[id]/page.tsx`
  **Verification:**
  - Run: `cat 'apps/web/src/app/(admin)/tables/[id]/page.tsx' | grep -E 'TableQRCode|params.id'`
  - Expected: Page shows table details and QR code for specific table

- [ ] 3.6.7 Write unit tests for table CRUD and QR generation
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/unit/services/tableService.test.ts`
  - Expected: Table CRUD and QR signature tests pass

### 3.7 Order Management
- [ ] 3.7.1 Create `GET /api/admin/orders` endpoint with status and date filters
  **Verification:**
  - Run: `curl -s 'http://localhost:3000/api/admin/orders?status=pending_payment&from=2024-01-01' | jq '.orders'`
  - Expected: Returns filtered orders by status and date range

- [ ] 3.7.2 Create `PATCH /api/orders/[id]/status` endpoint for status updates
  **Verification:**
  - Run: `curl -s -X PATCH http://localhost:3000/api/orders/[order-id]/status -d '{"status":"preparing"}' | jq '.status'`
  - Expected: Updates order status and creates status history entry

- [ ] 3.7.3 Build `OrderList` component with status filter and date range picker
  **Verification:**
  - Run: `cat apps/web/src/components/admin/OrderList.tsx | grep -E 'status|filter|dateRange'`
  - Expected: Filter controls for status and date range; fetches filtered results

- [ ] 3.7.4 Build `OrderDetailAdmin` component with full order details and status history
  **Verification:**
  - Run: `cat apps/web/src/components/admin/OrderDetailAdmin.tsx | grep -E 'items|statusHistory|history'`
  - Expected: Shows order items, customer info, and status change timeline

- [ ] 3.7.5 Create orders page `apps/web/src/app/(admin)/orders/page.tsx`
  **Verification:**
  - Run: `cat apps/web/src/app/\(admin\)/orders/page.tsx | grep -E 'OrderList|OrderDetailAdmin'`
  - Expected: Page renders order list with filter controls

- [ ] 3.7.6 Create order detail page `apps/web/src/app/(admin)/orders/[id]/page.tsx`
  **Verification:**
  - Run: `cat 'apps/web/src/app/(admin)/orders/[id]/page.tsx' | grep -E 'OrderDetailAdmin|params.id'`
  - Expected: Page shows full order details with action buttons

- [ ] 3.7.7 Implement order cancellation and refund initiation
  **Verification:**
  - Run: `grep -E 'cancel|refund|cancelled|refunded' apps/web/src/app/api/orders/[id]/status/route.ts`
  - Expected: Cancellation sets status='cancelled'; refund initiates Stripe/Mercado Pago refund

- [ ] 3.7.8 Write unit tests for order status transitions
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/unit/services/orderService.test.ts | grep -i 'status'`
  - Expected: Status transition tests pass; invalid transitions rejected

### 3.8 Kitchen Display and Waiter Mode
- [ ] 3.8.1 Build `KitchenDisplay` component showing pending orders sorted by age
  **Verification:**
  - Run: `cat apps/web/src/components/waiter/KitchenDisplay.tsx | grep -E 'pending|sort|age|created_at'`
  - Expected: Orders sorted by oldest first; shows time since order placed

- [ ] 3.8.2 Build `WaiterDashboard` component with real-time order notifications
  **Verification:**
  - Run: `cat apps/web/src/components/waiter/WaiterDashboard.tsx | grep -E 'notification|OrderNotification|realtime'`
  - Expected: Dashboard shows new order notifications in real-time

- [ ] 3.8.3 Build `OrderNotification` component with accept/reject actions
  **Verification:**
  - Run: `cat apps/web/src/components/waiter/OrderNotification.tsx | grep -E 'accept|reject|notification'`
  - Expected: Notification shows order details with accept and reject buttons

- [ ] 3.8.4 Implement Supabase Realtime subscription for order updates
  **Verification:**
  - Run: `grep -E 'channel|onInsert|realtime' apps/web/src/hooks/useWaiterOrders.ts`
  - Expected: Subscribes to orders channel; triggers notification on new order

- [ ] 3.8.5 Implement polling fallback (10 second interval) when realtime connection is lost
  **Verification:**
  - Run: `grep -E 'setInterval|polling|10.*second|fallback' apps/web/src/hooks/useWaiterOrders.ts`
  - Expected: Polls /api/admin/orders every 10 seconds when realtime disconnected

- [ ] 3.8.6 Build connection status indicator for waiter mode
  **Verification:**
  - Run: `grep -E 'connected|disconnected|status.*indicator' apps/web/src/components/waiter/WaiterDashboard.tsx`
  - Expected: Shows green/red indicator for realtime connection status

- [ ] 3.8.7 Create waiter dashboard page `apps/web/src/app/(waiter)/dashboard/page.tsx`
  **Verification:**
  - Run: `cat apps/web/src/app/\(waiter\)/dashboard/page.tsx | grep -E 'WaiterDashboard|KitchenDisplay'`
  - Expected: Page renders waiter dashboard with kitchen display

- [ ] 3.8.8 Implement waiter role permissions (only access to orders and kitchen display)
  **Verification:**
  - Run: `grep -E 'role.*waiter|waiter.*only|roleGuard' apps/web/src/app/\(waiter\)/layout.tsx`
  - Expected: Waiter route group checks for waiter/manager/owner role

- [ ] 3.8.9 Write unit tests for realtime order notifications
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/unit/hooks/useWaiterOrders.test.ts`
  - Expected: Realtime subscription and fallback polling tested

### 3.9 Analytics Dashboard
- [ ] 3.9.1 Create `GET /api/admin/analytics` endpoint with orders count and revenue
  **Verification:**
  - Run: `curl -s 'http://localhost:3000/api/admin/analytics?from=2024-01-01&to=2024-01-31' | jq '.orders_count,.revenue'`
  - Expected: Returns total orders count and revenue for period

- [ ] 3.9.2 Build `AnalyticsDashboard` component with charts (orders by period, popular items)
  **Verification:**
  - Run: `cat apps/web/src/components/admin/AnalyticsDashboard.tsx | grep -E 'chart|recharts|popular'`
  - Expected: Dashboard renders charts for orders over time and top products

- [ ] 3.9.3 Create analytics page `apps/web/src/app/(admin)/analytics/page.tsx`
  **Verification:**
  - Run: `cat apps/web/src/app/\(admin\)/analytics/page.tsx | grep -E 'AnalyticsDashboard|dateRange'`
  - Expected: Page renders analytics dashboard with date range selector

- [ ] 3.9.4 Implement date range selector for analytics
  **Verification:**
  - Run: `grep -E 'DateRange|from|to|period' apps/web/src/components/admin/AnalyticsDashboard.tsx`
  - Expected: Date range picker updates analytics query params

### 3.10 Staff User Management
- [ ] 3.10.1 Create staff user invitation flow (email invitation via Supabase Auth)
  **Verification:**
  - Run: `grep -E 'invite|email.*invitation|signup' apps/web/src/lib/supabase/auth.ts`
  - Expected: Sends invitation email via Supabase Auth invite method

- [ ] 3.10.2 Build role assignment UI (owner, manager, staff)
  **Verification:**
  - Run: `cat apps/web/src/components/admin/UserManagement.tsx | grep -E 'role|owner|manager|staff|select'`
  - Expected: Dropdown to assign role to invited user

- [ ] 3.10.3 Implement user management page for owner role only
  **Verification:**
  - Run: `cat apps/web/src/app/\(admin\)/users/page.tsx | grep -E 'useRole|owner.*only|ProtectedRoute'`
  - Expected: Page only accessible to owner role; shows user list

- [ ] 3.10.4 Write unit tests for role-based access control
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/unit/hooks/useRole.test.ts`
  - Expected: Role permission tests pass; unauthorized access rejected

## Phase 4: Offline + Polish

### 4.1 Background Sync
- [ ] 4.1.1 Implement order queue in IndexedDB (`pending_sync` status)
  **Verification:**
  - Run: `grep -E 'pending_sync|queued|queue' apps/web/src/lib/offline/sync.ts`
  - Expected: Orders submitted offline saved with pending_sync status

- [ ] 4.1.2 Register Background Sync event in Service Worker
  **Verification:**
  - Run: `grep -E 'backgroundSync|register| sync ' apps/web/public/sw.js`
  - Expected: Service worker registers 'order-sync' Background Sync event

- [ ] 4.1.3 Implement sync logic to replay queued orders on reconnect
  **Verification:**
  - Run: `grep -E 'sync|replay|pending_sync' apps/web/src/lib/offline/sync.ts`
  - Expected: On sync event, replays all pending_sync orders to server

- [ ] 4.1.4 Implement retry logic with exponential backoff (max 3 retries)
  **Verification:**
  - Run: `grep -E 'retry|backoff|exponential|max.*3' apps/web/src/lib/offline/sync.ts`
  - Expected: Failed syncs retry with exponential backoff; max 3 attempts

- [ ] 4.1.5 Display manual retry button after 3 consecutive failures
  **Verification:**
  - Run: `grep -E 'retry.*button|manual.*retry|failed.*3' apps/web/src/components/cart/SyncStatus.tsx`
  - Expected: After 3 failed retries, UI shows manual retry button

- [ ] 4.1.6 Implement sync status display in UI
  **Verification:**
  - Run: `cat apps/web/src/components/cart/SyncStatus.tsx | grep -E 'pending|syncing|synced|failed'`
  - Expected: Shows count of pending items and sync status

- [ ] 4.1.7 Write unit tests for sync queue and retry logic
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/unit/lib/offline.test.ts`
  - Expected: Sync queue and exponential backoff tests pass

### 4.2 Offline Menu Cache
- [ ] 4.2.1 Implement cache-first strategy for menu data
  **Verification:**
  - Run: `grep -E 'cacheFirst|cache-first|StaleWhileRevalidate' apps/web/src/lib/offline/cache.ts`
  - Expected: Menu fetch uses cache-first strategy

- [ ] 4.2.2 Implement cache invalidation when admin saves menu changes
  **Verification:**
  - Run: `grep -E 'invalidate|clear.*cache|admin.*save' apps/web/src/lib/offline/cache.ts`
  - Expected: Admin menu save triggers cache invalidation broadcast

- [ ] 4.2.3 Implement `apps/web/src/lib/offline/cache.ts` for menu cache operations
  **Verification:**
  - Run: `cat apps/web/src/lib/offline/cache.ts | grep -E 'getMenu|setMenu|categories|products'`
  - Expected: Cache module handles get/set for categories, products, modifiers

- [ ] 4.2.4 Implement stale-while-revalidate for menu data
  **Verification:**
  - Run: `grep -E 'stale-while-revalidate|StaleWhileRevalidate' apps/web/src/lib/offline/cache.ts`
  - Expected: Menu uses SWR to serve stale while fetching fresh data

- [ ] 4.2.5 Write unit tests for cache invalidation logic
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/unit/lib/cache.test.ts`
  - Expected: Cache invalidation tests pass; stale data served correctly

### 4.3 PWA Configuration
- [ ] 4.3.1 Create `manifest.json` with app name, icons, theme color, and display mode
  **Verification:**
  - Run: `cat apps/web/public/manifest.json | grep -E 'name|icons|theme_color|display'`
  - Expected: Manifest has name, icons array (192x192, 512x512), theme_color, display: standalone

- [ ] 4.3.2 Generate and add PWA icons (192x192, 512x512) to `apps/web/public/`
  **Verification:**
  - Run: `ls apps/web/public/icon-192x192.png apps/web/public/icon-512x512.png`
  - Expected: Both icon files exist in public directory

- [ ] 4.3.3 Configure PWA for standalone display mode
  **Verification:**
  - Run: `grep -E '"display":|"display":\s*"standalone"' apps/web/public/manifest.json`
  - Expected: Display mode set to standalone in manifest

- [ ] 4.3.4 Create offline fallback page with "Você está offline" message
  **Verification:**
  - Run: `cat apps/web/public/offline.html | grep -E 'offline|Você.*está.*offline'`
  - Expected: Offline page displays Portuguese offline message

- [ ] 4.3.5 Configure service worker for offline-first navigation
  **Verification:**
  - Run: `grep -E 'navigationPreload|NetworkFirst|routing' apps/web/public/sw.js`
  - Expected: SW configured for offline-first navigation with fallback to network

- [ ] 4.3.6 Write integration tests for service worker registration and update
  **Verification:**
  - Run: `pnpm --filter web test:unit -- --run apps/web/src/tests/integration/workers/sw.test.ts`
  - Expected: SW registration and update lifecycle tests pass

### 4.4 Performance Optimization
- [ ] 4.4.1 Implement image optimization (next/image with lazy loading)
  **Verification:**
  - Run: `grep -E 'next/image|Image|lazy' apps/web/src/components/menu/ProductCard.tsx`
  - Expected: Uses next/image with loading="lazy" for product images

- [ ] 4.4.2 Implement code splitting per route
  **Verification:**
  - Run: `grep -E 'dynamic|loadable|suspense' apps/web/src/app/\(customer\)/menu/page.tsx`
  - Expected: Heavy components wrapped in dynamic() imports

- [ ] 4.4.3 Run Lighthouse audit and address PWA score < 90 issues
  **Verification:**
  - Run: `npx lighthouse http://localhost:3000 --output=json | jq '.categories.performance.score,.categories.pwa.score'`
  - Expected: PWA score ≥ 90 after optimizations

- [ ] 4.4.4 Optimize bundle size (tree shaking, dynamic imports)
  **Verification:**
  - Run: `pnpm --filter web build 2>&1 | grep -E 'bundle.*size|First Load JS'`
  - Expected: First Load JS < 150kB after optimizations

- [ ] 4.4.5 Implement menu data compression for IndexedDB storage
  **Verification:**
  - Run: `grep -E 'compress|gzip|deflate' apps/web/src/lib/offline/cache.ts`
  - Expected: Menu data compressed before IndexedDB storage; decompressed on read

### 4.5 Connectivity UI
- [ ] 4.5.1 Build `OfflineIndicator` component showing offline status
  **Verification:**
  - Run: `cat apps/web/src/components/shared/OfflineIndicator.tsx | grep -E 'navigator.onLine|offline|online'`
  - Expected: Listens to online/offline events; shows indicator when disconnected

- [ ] 4.5.2 Build `SyncStatus` component showing pending sync count
  **Verification:**
  - Run: `cat apps/web/src/components/shared/SyncStatus.tsx | grep -E 'pending_sync|count|badge'`
  - Expected: Shows badge with number of orders waiting to sync

- [ ] 4.5.3 Implement "Conexão restaurada" toast on reconnect
  **Verification:**
  - Run: `grep -E 'Conexão.*restaurada|toast.*online|notify.*reconnect' apps/web/src/components/shared/OfflineIndicator.tsx`
  - Expected: Toast notification shown when browser reconnects

- [ ] 4.5.4 Integrate connectivity indicators into root layout
  **Verification:**
  - Run: `grep -E 'OfflineIndicator|SyncStatus' apps/web/src/app/layout.tsx`
  - Expected: Root layout renders OfflineIndicator and SyncStatus

## Phase 5: E2E Test Suite (Pure Playwright — no Cucumber)

### 5.1 Playwright Configuration
- [ ] 5.1.1 Install Playwright (latest) in `apps/e2e/` with chromium, firefox, webkit
  **Verification:**
  - Run: `cat apps/e2e/package.json | grep -E 'playwright|@playwright'`
  - Expected: Playwright 1.x+ installed with browsers

- [ ] 5.1.2 Configure `playwright.config.ts` with baseURL, timeouts, retries, reporters
  **Verification:**
  - Run: `cat apps/e2e/playwright.config.ts | grep -E 'baseURL|timeout|retries|reporter'`
  - Expected: Config exists with web, headless, 2 retries, HTML reporter

- [ ] 5.1.3 Set up test directory structure: `tests/` with `customer/`, `admin/`, `waiter/`, `shared/`
  **Verification:**
  - Run: `ls -d apps/e2e/tests/*/`
  - Expected: customer, admin, waiter, shared test directories exist

- [ ] 5.1.4 Create `tests/shared/` with fixtures for: guest, authenticated, admin, waiter
  **Verification:**
  - Run: `ls apps/e2e/tests/shared/fixtures/`
  - Expected: Fixture files for all user types exist

- [ ] 5.1.5 Create `tests/shared/helpers/api.ts` for test data seeding via Supabase
  **Verification:**
  - Run: `cat apps/e2e/tests/shared/helpers/api.ts | grep -E 'seed|createTest|supabase'`
  - Expected: Helper functions for creating test data

### 5.2 Page Objects
- [ ] 5.2.1 Create `pages/MenuPage.ts` — category browsing, product view, dietary filters, search
  **Verification:**
  - Run: `cat apps/e2e/pages/MenuPage.ts | grep -E 'visit|categoryCard|productCard|filter'`
  - Expected: Page object has all menu interaction methods

- [ ] 5.2.2 Create `pages/CartPage.ts` — add/remove items, quantity controls, cart drawer
  **Verification:**
  - Run: `cat apps/e2e/pages/CartPage.ts | grep -E 'addItem|removeItem|openDrawer|checkout'`
  - Expected: Page object encapsulates all cart operations

- [ ] 5.2.3 Create `pages/CheckoutPage.ts` — payment method selection, order review, submission
  **Verification:**
  - Run: `cat apps/e2e/pages/CheckoutPage.ts | grep -E 'selectPayment|submit|orderReview|pix|card'`
  - Expected: Page object handles both Pix and Card flows

- [ ] 5.2.4 Create `pages/OrderPage.ts` — order confirmation, status, history, reorder
  **Verification:**
  - Run: `cat apps/e2e/pages/OrderPage.ts | grep -E 'orderId|status|history|reorder'`
  - Expected: Page object for confirmation and history views

- [ ] 5.2.5 Create `pages/AdminLoginPage.ts` — admin authentication
  **Verification:**
  - Run: `cat apps/e2e/pages/AdminLoginPage.ts | grep -E 'login|email|password|submit'`
  - Expected: Login form interaction methods

- [ ] 5.2.6 Create `pages/AdminDashboardPage.ts` — sidebar nav, categories, products links
  **Verification:**
  - Run: `cat apps/e2e/pages/AdminDashboardPage.ts | grep -E 'sidebar|navigate|toCategories|toProducts'`
  - Expected: Dashboard navigation methods

- [ ] 5.2.7 Create `pages/AdminCategoriesPage.ts` — category CRUD operations
  **Verification:**
  - Run: `cat apps/e2e/pages/AdminCategoriesPage.ts | grep -E 'create|edit|delete|save'`
  - Expected: CRUD interaction methods

- [ ] 5.2.8 Create `pages/AdminProductsPage.ts` — product CRUD with image upload
  **Verification:**
  - Run: `cat apps/e2e/pages/AdminProductsPage.ts | grep -E 'create|upload|save|delete'`
  - Expected: Product CRUD with file upload support

- [ ] 5.2.9 Create `pages/AdminOrdersPage.ts` — order list, filters, status updates
  **Verification:**
  - Run: `cat apps/e2e/pages/AdminOrdersPage.ts | grep -E 'list|filter|updateStatus|cancel'`
  - Expected: Order management interactions

- [ ] 5.2.10 Create `pages/WaiterDashboardPage.ts` — kitchen display, order notifications
  **Verification:**
  - Run: `cat apps/e2e/pages/WaiterDashboardPage.ts | grep -E 'orderNotification|accept|reject|kitchen'`
  - Expected: Waiter-specific interactions

- [ ] 5.2.11 Create `pages/TableQRPage.ts` — QR generation, download, print
  **Verification:**
  - Run: `cat apps/e2e/pages/TableQRPage.ts | grep -E 'generateQR|download|print|canvas'`
  - Expected: QR code operations

### 5.3 E2E Test Specs (Native Playwright .spec.ts)
- [ ] 5.3.1 Create `tests/customer/menu.spec.ts` — browse categories, view products, dietary filter, search
  **Verification:**
  - Run: `ls apps/e2e/tests/customer/menu.spec.ts && grep -c 'test\|it' apps/e2e/tests/customer/menu.spec.ts`
  - Expected: At least 4 test cases covering all menu flows

- [ ] 5.3.2 Create `tests/customer/cart.spec.ts` — add, update qty, remove, clear, modifiers, combos
  **Verification:**
  - Run: `ls apps/e2e/tests/customer/cart.spec.ts`
  - Expected: Cart flow tests

- [ ] 5.3.3 Create `tests/customer/checkout.spec.ts` — payment selection, order review, confirmation
  **Verification:**
  - Run: `ls apps/e2e/tests/customer/checkout.spec.ts`
  - Expected: Checkout flow tests

- [ ] 5.3.4 Create `tests/customer/payment.spec.ts` — Pix flow, card flow, payment status
  **Verification:**
  - Run: `ls apps/e2e/tests/customer/payment.spec.ts`
  - Expected: Both Pix and card payment tests

- [ ] 5.3.5 Create `tests/customer/order.spec.ts` — creation, confirmation, status, history, reorder
  **Verification:**
  - Run: `ls apps/e2e/tests/customer/order.spec.ts`
  - Expected: Order lifecycle tests

- [ ] 5.3.6 Create `tests/admin/auth.spec.ts` — login, session expiry, password reset
  **Verification:**
  - Run: `ls apps/e2e/tests/admin/auth.spec.ts`
  - Expected: Admin auth flow tests

- [ ] 5.3.7 Create `tests/admin/categories.spec.ts` — CRUD, reorder, soft-delete
  **Verification:**
  - Run: `ls apps/e2e/tests/admin/categories.spec.ts`
  - Expected: Category management tests

- [ ] 5.3.8 Create `tests/admin/products.spec.ts` — CRUD with image upload, dietary labels
  **Verification:**
  - Run: `ls apps/e2e/tests/admin/products.spec.ts`
  - Expected: Product management with image upload tests

- [ ] 5.3.9 Create `tests/admin/orders.spec.ts` — list, filters, status update, cancel, refund
  **Verification:**
  - Run: `ls apps/e2e/tests/admin/orders.spec.ts`
  - Expected: Order management tests

- [ ] 5.3.10 Create `tests/waiter/kitchen.spec.ts` — new order notifications, accept/reject, display
  **Verification:**
  - Run: `ls apps/e2e/tests/waiter/kitchen.spec.ts`
  - Expected: Kitchen display and waiter interaction tests

- [ ] 5.3.11 Create `tests/customer/offline.spec.ts` — go offline, queue order, reconnect, sync
  **Verification:**
  - Run: `ls apps/e2e/tests/customer/offline.spec.ts`
  - Expected: Offline order queue and sync tests

- [ ] 5.3.12 Create `tests/admin/table-qr.spec.ts` — QR generation, download, validation
  **Verification:**
  - Run: `ls apps/e2e/tests/admin/table-qr.spec.ts`
  - Expected: QR code generation and management tests

### 5.4 CI Integration
- [ ] 5.4.1 Add `test:e2e` script to `apps/e2e/package.json` (runs playwright test)
  **Verification:**
  - Run: `grep 'test:e2e' apps/e2e/package.json`
  - Expected: Script: `"test:e2e": "playwright test"`

- [ ] 5.4.2 Create `.github/workflows/e2e.yml` with Playwright test job on PR
  **Verification:**
  - Run: `cat .github/workflows/e2e.yml | grep -E 'playwright|test:e2e'`
  - Expected: CI runs E2E tests on PR

- [ ] 5.4.3 Configure Playwright server for CI (port allocation, dependencies)
  **Verification:**
  - Run: `cat .github/workflows/e2e.yml | grep -E 'port|server|dependencies'`
  - Expected: Server dependencies configured for headless CI

### 5.5 Coverage Integration
- [ ] 5.5.1 Configure Vitest coverage with JSON/HTML reporters
  **Verification:**
  - Run: `cat apps/web/vitest.config.ts | grep -E 'reporter.*json|reporter.*html'`
  - Expected: Both JSON and HTML coverage reporters configured

- [ ] 5.5.2 Verify ≥80% coverage for services, hooks, stores
  **Verification:**
  - Run: `pnpm --filter web test:coverage 2>&1 | grep -E 'coverage.*%|statements|branches'`
  - Expected: Coverage ≥80% for all 4 categories

- [ ] 5.5.3 Add coverage gate to CI (fail if < 80%)
  **Verification:**
  - Run: `grep -E 'coverage.*threshold|80' .github/workflows/*.yml`
  - Expected: CI job fails if coverage drops below threshold
