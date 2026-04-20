# Proposal: Cardápio Digital

## Intent

Cardápio Digital is a full-featured restaurant management platform enabling customers to browse menus and place orders via QR code, while restaurant staff manage orders and the menu catalog through an administrative panel. The system prioritizes offline-first operation for reliability in environments with poor connectivity.

**Business Value:**
- Eliminates friction in the order-to-kitchen pipeline by digitizing table orders
- Reduces waiter workload for status updates and order transmission
- Enables real-time menu updates without reprinting physical menus
- Provides audit trail for orders and inventory through Supabase-backed persistence
- Differentiates the restaurant with a modern, mobile-first ordering experience

**Problem Statement:**
Restaurant operations currently rely on manual order-taking, physical menus, and verbal communication to the kitchen. This creates errors, delays, and limits the restaurant's ability to update pricing or offerings in real time.

---

## Scope

### In Scope

**Customer-Facing Features:**
- QR code scanning to identify table and restaurant
- Category-based menu browsing with search and dietary filter support
- Product detail view with modifiers, nutritional labels, and images
- Shopping cart with add/remove/update quantities
- Checkout flow with order review and payment method selection
- Payment integration: Pix (real-time via mercado pago or similar) and credit card (Stripe or similar)
- Order confirmation screen with estimated preparation time
- Order history and reorder capability

**Waiter Mode (Modo Garçom):**
- Real-time incoming order notifications per table
- Order acceptance/rejection workflow
- Order status updates (received, preparing, ready, delivered)
- Kitchen display integration (KDS) view for pending orders

**Administrative Panel:**
- Authentication and role-based access (owner, manager, staff)
- Category CRUD (name, description, display order, active/inactive)
- Product CRUD (name, description, price, image, category, dietary labels, modifier groups)
- Modifier group CRUD (name, optional/required, min/max selections)
- Modifier value CRUD (name, price adjustment, available/inactive)
- Combo/group CRUD linking products with modifier defaults and bundle pricing
- Table QR code generation and management
- Order list with status filtering and date range selection
- Basic analytics: orders per period, average ticket, popular items

**Technical Features:**
- PWA with service worker for offline browsing and order submission
- IndexedDB for local menu cache and pending order queue
- Supabase Auth for admin panel and optional customer accounts
- Supabase Realtime for live order status updates
- Background sync to push queued orders when connectivity returns

### Out of Scope

- Inventory management or stock alerts
- Multi-restaurant chain management (single tenant only)
- Customer loyalty program or rewards
- Print formatting for kitchen tickets (integration via third-party KDS only)
- Delivery logistics or dispatch management
- Third-party delivery aggregator integration (iFood, Rappi, etc.)
- Table reservation or booking system
- Multi-language menu support (i18n)
- Custom theme or white-labeling per restaurant

---

## Approach

**Tech Stack:**
- Next.js 14+ with App Router and TypeScript
- Supabase (Auth, Realtime, Postgres, Storage)
- Service Workers + IndexedDB (Workbox)
- Vitest for unit tests (≥80% coverage)
- Playwright + Cucumber for E2E tests
- PWA manifest and offline fallback pages

**Architecture:**
```
apps/web/                    # Next.js PWA
  src/
    app/                     # App Router pages
      (customer)/            # Customer-facing routes
        menu/[categoryId]/
        product/[productId]/
        cart/
        checkout/
        orders/[orderId]/
      (admin)/               # Admin panel routes
        login/
        dashboard/
        categories/
        products/
        modifiers/
        combos/
        tables/
        orders/
      (waiter)/              # Waiter mode routes
        dashboard/
    components/              # Shared + domain components
    lib/                     # Supabase client, utilities
    hooks/                   # React hooks (useCart, useMenu, etc.)
    services/                # Business logic (order service, etc.)
    workers/                 # Service worker + SW utilities
    stores/                  # Zustand/MobX state stores
supabase/
  migrations/                # SQL migrations
  functions/                 # Supabase Edge Functions (Pix webhooks, etc.)
apps/e2e/                    # Playwright + Cucumber E2E tests
```

**Data Model (Supabase Postgres):**
- `restaurants` — id, name, address, logo_url, pix_config, stripe_config
- `tables` — id, restaurant_id, qr_code, label, active
- `categories` — id, restaurant_id, name, description, display_order, active
- `products` — id, category_id, name, description, price, image_url, dietary_labels[], active
- `modifier_groups` — id, product_id, name, required, min_selections, max_selections
- `modifier_values` — id, modifier_group_id, name, price_adjustment, active
- `combos` — id, restaurant_id, name, bundle_price, active
- `combo_items` — id, combo_id, product_id, quantity, modifier_group_id?
- `orders` — id, restaurant_id, table_id, status, total, payment_method, created_at
- `order_items` — id, order_id, product_id, quantity, unit_price, modifiers_json
- `order_status_history` — id, order_id, status, changed_at, changed_by

**Offline Strategy:**
- Menu data synced to IndexedDB on app load and on demand
- Cart state persisted in IndexedDB
- Orders submitted online; if offline, queued with pending status
- Service worker background sync replays queued orders on reconnect
- Connectivity status shown in UI via `navigator.onLine` + Supabase realtime status

**Payment Flow:**
1. Customer completes checkout → order created with status `pending_payment`
2. Frontend calls backend endpoint to create Pix charge (or Stripe PaymentIntent)
3. Customer pays via Pix or enters card details
4. Webhook updates order status to `paid` (or `payment_failed`)
5. Realtime event triggers waiter notification

**API Design:**
- RESTful endpoints via Next.js Route Handlers (`/api/*`)
- Supabase RLS policies enforce tenant isolation
- Edge Functions handle Pix webhooks and async payment confirmation

---

## Affected Areas

| Area | Impact |
|---|---|
| `apps/web/src/app/` | New customer-facing routes, admin panel, waiter mode |
| `apps/web/src/components/` | New menu, cart, checkout, admin components |
| `apps/web/src/lib/` | Supabase client, offline utilities |
| `apps/web/src/hooks/` | useMenu, useCart, useOrders, useAuth |
| `apps/web/src/services/` | OrderService, MenuService, PaymentService |
| `apps/web/src/stores/` | cartStore, menuStore, orderStore (Zustand) |
| `apps/web/src/workers/` | Service worker, background sync |
| `supabase/migrations/` | Full database schema |
| `supabase/functions/` | Pix webhook handler, payment handlers |
| `apps/e2e/` | New Cucumber step definitions and feature files |
| Documentation | README updated with setup instructions |

---

## Risks

1. **Offline order submission** — If background sync fails (browser incompatibility), orders may be silently lost. Mitigation: show explicit warning when offline with retry button.
2. **Payment webhook reliability** — Pix confirmation depends on external callback. Mitigation: polling fallback if no webhook received within 30 seconds.
3. **Supabase Realtime connection drops** — Waiter mode may miss notifications. Mitigation: polling fallback every 10 seconds when connection is lost.
4. **IndexedDB storage limits** — Large menus with many images may exceed browser quota. Mitigation: cache images separately and limit cached product fields.
5. **Concurrent order editing** — Race condition when waiter and kitchen both update status. Mitigation: optimistic UI with server-side last-write-wins + conflict notification.
6. **QR code table identification** — If table QR is duplicated or misprinted, orders route to wrong table. Mitigation: include table + restaurant signature in QR payload with validation on scan.

---

## Rollback Plan

**Rollback Mechanism:**

Because this is a greenfield project with no prior state:

1. **Feature Flag Gating** — All new features wrapped behind feature flags (`NEXT_PUBLIC_FEATURE_*`) to allow disabling without deployment rollback.
2. **Database Migration Reversal** — Each Supabase migration is versioned and reversible. Down migration scripts are provided for each schema change.
3. **Deployment Rollback** — If a breaking issue is discovered post-deploy, revert `apps/web` to the previous image tag via container registry.
4. **Data Rollback** — If data corruption occurs, Supabase Point-in-Time Recovery can restore the database to a specific timestamp within 7 days (Supabase Pro plan).

**Rollback Decision Matrix:**

| Severity | Trigger | Action |
|---|---|---|
| Critical | Payment processing broken | Disable payment feature flag → cash-only mode |
| High | Order creation failing | Disable order submission → display "temporarily unavailable" |
| Medium | Offline mode data loss | Disable offline sync → require online for ordering |
| Low | Admin panel degraded | Route to read-only mode with cached data |

---

## Success Criteria

| ID | Criterion | Measurement |
|---|---|---|
| SC-01 | Customer can complete a full order flow (browse → pay → confirm) in ≤ 3 minutes on a simulated 4G connection | E2E test completes within threshold |
| SC-02 | Menu loads within 2 seconds on first load, ≤ 500ms on repeat ( IndexedDB cache) | Lighthouse / Playwright timing audit |
| SC-03 | Offline order submission queued and successfully synced when connectivity returns | Manual offline test + E2E scenario |
| SC-04 | Admin can create, update, and delete categories, products, and modifiers without data loss | CRUD E2E scenarios pass |
| SC-05 | Waiter receives real-time notification of new order within 5 seconds of order placement | Realtime latency E2E test |
| SC-06 | Pix payment completed end-to-end within 60 seconds of QR code display | E2E + manual test |
| SC-07 | Unit test coverage ≥ 80% for business logic (services, hooks, stores) | Vitest coverage report |
| SC-08 | All critical user flows have passing Cucumber scenarios | `cucumber-js` exit code 0 |
| SC-09 | PWA passes Lighthouse PWA audit (installable, offline-capable) | Lighthouse score ≥ 90 |
| SC-10 | Database schema enforces referential integrity and RLS policies prevent cross-tenant data access | Supabase migration validation |
