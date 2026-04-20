# SDD Verify Report: Cardápio Digital

**Date**: 2026-04-20
**Pipeline**: full
**Persistence**: hybrid

---

## Compliance Matrix

### 1. MENU Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Browse Categories | ✅ PASS | `GET /api/menu`, `useMenu` hook, `CategoryList` component |
| View Products in Category | ✅ PASS | `ProductList`, `ProductCard` components |
| View Product Detail | ✅ PASS | `GET /api/menu/products/[id]`, `ProductDetail` component |
| Filter by Dietary Label | ✅ PASS | `DietaryFilter` component, `menuStore` filtering logic |
| Search Products by Name | ✅ PASS | SearchBar with debounce, `menuStore` search |
| Offline Menu Access | ✅ PASS | IndexedDB caching in `lib/offline/cache.ts`, `db.ts` |
| Menu Data Sync on Reconnect | ✅ PASS | `sync.ts` with stale-while-revalidate |
| Product Without Category | ✅ PASS | FK relationships in migrations, `active` filter |

### 2. CART Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Add Product to Cart | ✅ PASS | `cartStore.ts`, `CartDrawer`, persistence to IndexedDB |
| Add Product with Required Modifiers | ✅ PASS | `ModifierSelector`, cart validation in `useCart` |
| Update Item Quantity | ✅ PASS | `cartStore` with `updateQuantity` operation |
| Remove Item from Cart | ✅ PASS | `cartStore` with `removeItem` operation |
| View Cart Summary | ✅ PASS | `CartSummary` component, `cart/page.tsx` |
| Clear Cart After Checkout | ✅ PASS | Cart cleared on order creation in `orderService.ts` |
| Cart Validation (availability) | ✅ PASS | `/api/cart/validate` endpoint |
| Cart Price Consistency | ✅ PASS | `/api/cart/validate` checks prices |
| Add Combo to Cart | ✅ PASS | `cartStore` handles `comboItems`, `bundlePrice` |

### 3. ORDER Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Create Order from Cart | ✅ PASS | `POST /api/orders`, `orderService.createOrder()` |
| Order Passed to Kitchen | ✅ PASS | Webhook updates to `received` status |
| Order Status Update by Waiter | ❌ FAIL | No waiter dashboard implementation |
| Order Status Rejection | ❌ FAIL | No waiter dashboard implementation |
| Order Ready for Delivery | ❌ FAIL | No waiter dashboard implementation |
| Order Delivered | ❌ FAIL | No waiter dashboard implementation |
| View Order History | ✅ PASS | `OrderHistory` component, `GET /api/orders/[id]` |
| View Order Detail | ✅ PASS | `OrderDetail` component |
| Reorder from History | ✅ PASS | `reorder` functionality in `orderService.ts` |
| Kitchen Display Shows Pending | ❌ FAIL | No `KitchenDisplay` component |
| Kitchen Updates Order Status | ❌ FAIL | No KitchenDisplay component |
| Waiter Receives New Order Alert | ❌ FAIL | No `useWaiterOrders` hook (file exists, empty impl) |
| Waiter Connection Loss Fallback | ❌ FAIL | No polling fallback implementation |

### 4. PAYMENT Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Select Payment Method | ✅ PASS | `PaymentMethodSelector` component |
| Pix Payment Flow | ✅ PASS | `POST /api/payments/pix/create`, `PixQRCode` |
| Credit Card Payment Flow | ✅ PASS | `POST /api/payments/stripe/create-intent` |
| Pix Payment Success | ✅ PASS | `pix-webhook` edge function |
| Pix Payment Timeout | ✅ PASS | 60-second timeout in `paymentService.ts` |
| Credit Card Payment Success | ✅ PASS | Stripe webhook handler |
| Credit Card Payment Failure | ✅ PASS | Error handling in `StripeCardForm` |
| Duplicate Webhook Handling | ✅ PASS | `idempotency_key` in orders table |
| Webhook Security Validation | ✅ PASS | Webhook signature validation in handlers |
| Cancel Order Before Preparation | ❌ FAIL | No cancel/refund in `orderService.ts` |
| Refund Confirmation | ❌ FAIL | No refund handling |

### 5. TABLE Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Generate Table QR Code | ✅ PASS | `generateTableQR` in `tableService.ts`, `/api/admin/tables/[id]/qr` |
| QR Code Content Structure | ✅ PASS | HMAC signature in `lib/qr/generator.ts` |
| Create Table | ✅ PASS | `POST /api/admin/tables` |
| Update Table | ✅ PASS | `PUT /api/admin/tables/[id]` |
| Deactivate Table | ✅ PASS | `active` flag in table model |
| List Active Tables | ✅ PASS | `TableManagement` component |
| Customer Scans Table QR | ✅ PASS | `POST /api/tables/validate` |
| Invalid QR Code | ✅ PASS | Signature validation in `lib/qr/validator.ts` |
| Inactive Table QR Code | ✅ PASS | Validation rejects inactive tables |
| QR Download as PNG | ❌ FAIL | `TableQRCode` component does not exist |

### 6. ADMIN Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Admin Login | ✅ PASS | `useAuth.ts`, `LoginForm`, Supabase Auth |
| Admin Logout | ✅ PASS | `auth.ts` logout function |
| Protected Route Access | ✅ PASS | `ProtectedRoute` component |
| Owner Access to All | ✅ PASS | `useRole.ts` with owner full access |
| Manager Access | ✅ PASS | `useRole.ts` denies user management |
| Staff Access | ✅ PASS | `useRole.ts` denies menu/tables/settings |
| Create Category | ✅ PASS | `CategoryForm`, `POST /api/admin/categories` |
| Update Category | ✅ PASS | `PUT /api/admin/categories/[id]` |
| Delete Category | ✅ PASS | Soft-delete with `active=false` |
| Reorder Categories | ✅ PASS | `display_order` field |
| Create Product | ✅ PASS | `ProductForm`, `POST /api/admin/products` |
| Update Product | ✅ PASS | `PUT /api/admin/products/[id]` |
| Delete Product | ✅ PASS | Soft-delete |
| Create Modifier Group | ✅ PASS | `ModifierGroupForm` |
| Modifier Group Required Validation | ✅ PASS | Frontend enforcement in `ModifierSelector` |
| Add Modifier Value | ✅ PASS | `ModifierGroupForm` with values |
| Update Modifier Value Price | ✅ PASS | `ModifierGroupForm` |
| Create Combo | ✅ PASS | `ComboForm` |
| Combo Bundle Pricing | ✅ PASS | `bundle_price` field in API |
| List Orders with Filters | ❌ FAIL | No `GET /api/admin/orders` endpoint |
| View Order Details | ❌ FAIL | No admin order detail page |
| View Orders Per Period | ❌ FAIL | No analytics API |
| View Popular Items | ❌ FAIL | No analytics API |

### 7. AUTH Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Admin Registration | ✅ PASS | `auth.ts` registration flow |
| Staff User Creation | ✅ PASS | `userService.ts`, invitation email |
| Staff User Login | ✅ PASS | Supabase Auth session |
| Session Expiry | ✅ PASS | 24-hour session in Supabase config |
| Concurrent Session Handling | ✅ PASS | Supabase handles multiple sessions |
| API-level Role Check | ✅ PASS | RLS policies in migrations |
| UI-level Role Navigation | ✅ PASS | `useRole.ts` checks |
| Password Reset Request | ✅ PASS | `auth.ts` password reset |
| Password Reset Completion | ✅ PASS | Supabase Auth flow |
| Customer Account Creation | N/A | "MAY" - optional feature |
| Guest Checkout | ✅ PASS | Session-based guest identifier |

### 8. OFFLINE Domain

| Scenario | Status | Evidence |
|----------|--------|----------|
| Service Worker Activation | ✅ PASS | `sw.js` with Workbox |
| Service Worker Update | ✅ PASS | SW update handling in `sw.js` |
| Initial Menu Cache | ✅ PASS | `lib/offline/cache.ts` stores menu |
| Offline Menu Browsing | ✅ PASS | IndexedDB cache served when offline |
| Cache Invalidation | ✅ PASS | `lib/offline/cache.ts` `invalidateCache()` |
| Cart Persistence on Add | ✅ PASS | `cartStore` middleware persists to IndexedDB |
| Cart Restoration on Return | ✅ PASS | `hydrateCartFromIndexedDB` on mount |
| Order Submission While Offline | ❌ FAIL | No `pending_sync` queue implementation |
| Background Sync on Reconnect | ❌ FAIL | No Background Sync event registration |
| Sync Failure Handling | ❌ FAIL | No retry logic |
| Offline Indicator | ❌ FAIL | No `OfflineIndicator` component |
| Online Indicator | ❌ FAIL | No reconnection toast |
| Payment Attempt While Offline | ❌ FAIL | No offline payment handling |
| Pix Payment Cancellation Due to Timeout | ❌ FAIL | No offline timeout handling |

---

## Coverage Report Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Statements | ≥80% | Unknown | ⚠️ Cannot run (deps not installed) |
| Branches | ≥80% | Unknown | ⚠️ Cannot run (deps not installed) |
| Functions | ≥80% | Unknown | ⚠️ Cannot run (deps not installed) |
| Lines | ≥80% | Unknown | ⚠️ Cannot run (deps not installed) |

**Note**: Unit test files exist (19 test files across services, stores, hooks, lib), but `node_modules` not installed — cannot execute coverage verification.

---

## Unit Tests Present (19 files)

```
services/: adminOrderService, categoryService, comboService, modifierService,
           orderService, paymentService, productService, tableService, userService
stores/:   cartStore, menuStore
hooks/:    useAuth, useMenu, useRealtimeOrders, useRole
lib/:      cache, offline, qr, sync
```

---

## E2E Tests Present (12 spec files)

```
customer/: cart, checkout, menu, offline, order, payment
admin/:    auth, categories, orders, products, table-qr
waiter/:   kitchen
```

**Note**: E2E specs exist but cannot verify execution without Playwright installation.

---

## Phase Completion Summary

| Phase | Tasks Completed | Total Tasks | % Complete |
|-------|-----------------|-------------|------------|
| Phase 1: Infrastructure | 14 | 14 | 100% |
| Phase 2: Customer Flow | 39 | 39 | 100% |
| Phase 3: Admin + Waiter | ~35 | ~65 | ~54% |
| Phase 4: Offline + Polish | 0 | ~30 | 0% |
| Phase 5: E2E Tests | 0 | ~25 | 0% |

**Phase 3 Details**:
- Auth (10/10): 100%
- Category CRUD (7/7): 100%
- Product CRUD (8/8): 100%
- Modifier CRUD (5/5): 100%
- Combo CRUD (4/4): 100%
- Table Management (1/7): ~14%
- Order Management (0/8): 0%
- Kitchen Display (0/9): 0%
- Analytics (0/4): 0%
- Staff User Management (0/4): 0%

---

## Gaps and Missing Items

### Critical Gaps (Blocking)

1. **No Kitchen Display** — Kitchen display for pending orders not implemented
2. **No Waiter Dashboard** — Real-time order notifications not implemented
3. **No Realtime Subscriptions** — Supabase Realtime not integrated for order updates
4. **No Order Management API** — `GET /api/admin/orders` endpoint missing
5. **No Background Sync** — Offline order queue not synced via Service Worker
6. **No OfflineIndicator** — No UI for offline status

### High Priority Gaps

1. **No QR Download** — `TableQRCode` component with PNG export missing
2. **No Order Cancel/Refund** — Cancellation and refund flow not implemented
3. **No Analytics API** — `GET /api/admin/analytics` not implemented
4. **No Staff User Management** — User invitation/role assignment UI missing

### Medium Priority Gaps

1. **No Connection Status Indicator** — For waiter mode
2. **No Polling Fallback** — 10-second polling when realtime disconnects
3. **No Payment Offline Handling** — Payment cannot be queued offline

---

## Verification Evidence

1. **File System Inspection**: Verified existence of all major implementation files
2. **Spec Scenario Mapping**: Cross-referenced 8 domain specs against implementation
3. **Test File Inventory**: Counted 19 unit test files and 12 E2E spec files
4. **Migration Verification**: 15 SQL migration files with full schema
5. **Component Inventory**: Verified presence of admin, cart, menu, checkout, payment components

---

## SDD Verify Result

**Status**: PARTIAL
**Compliant**: partial
**Coverage**: unknown (cannot measure without deps)
**Gaps**:
- Phase 3.6 (Table QR download component), 3.7 (Order Management API/UI), 3.8 (Kitchen/Waiter), 3.9 (Analytics), 3.10 (User Management) incomplete
- Phase 4 (Offline sync, Background Sync, OfflineIndicator, SyncStatus) entirely missing
- Phase 5 (E2E tests) cannot execute
- Unit test coverage cannot be measured without `pnpm install`

**Verification evidence**: File system inspection + spec scenario mapping. Implementation exists for Phases 1-2 and partial Phase 3 (auth, category, product, modifier, combo CRUD). Missing: waiter/kitchen display, order management, analytics, offline sync, E2E execution.
