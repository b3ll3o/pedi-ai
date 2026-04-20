# Design: Cardápio Digital

## Technical Approach

**Stack**: Next.js 14+ (App Router) + TypeScript + Supabase + Service Workers + IndexedDB

This is a greenfield monorepo project implementing a full-featured digital restaurant menu with offline-first architecture. The application serves three user roles: customers (QR code → menu → order), waiters (real-time order notifications), and admins (menu/table/order management).

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js PWA (apps/web)                 │
├─────────────────────────────────────────────────────────────┤
│  Route Groups: (customer) | (admin) | (waiter) | api        │
├───────────────┬───────────────┬───────────────┬────────────┤
│   Components  │     Hooks      │    Stores     │  Services  │
├───────────────┴───────────────┴───────────────┴────────────┤
│                     lib/ (Supabase client, utils)           │
├─────────────────────────────────────────────────────────────┤
│  Service Worker (offline) │ IndexedDB (cache, queue)        │
├─────────────────────────────────────────────────────────────┤
│                 Supabase (Auth, Postgres, Realtime)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Decisions

### Decision: Offline-First with Background Sync

**Choice**: Service Worker + IndexedDB (Workbox) for offline menu browsing and order queuing with background sync.

**Alternatives considered**:
- Supabase Realtime subscriptions only (no offline): fails when connectivity drops
- Third-party offline-first SDK (e.g., WatermelonDB): adds dependency, less Next.js integration

**Rationale**: Restaurant environments have unreliable WiFi. Customers must browse menu and queue orders offline; sync happens automatically on reconnect. Service Worker provides the lowest-level control over caching and background sync behavior.

---

### Decision: Zustand for Client State + React Query for Server State

**Choice**: Zustand stores for cart/UI state; React Query (TanStack Query) for server state (menu data, orders).

**Alternatives considered**:
- Zustand for everything: no built-in cache invalidation or loading states
- Redux Toolkit: verbosity, larger bundle size

**Rationale**: Cart state is ephemeral and client-only (IndexedDB-persisted). Menu/server data benefits from React Query's cache management, background refetching, and optimistic updates.

---

### Decision: QR Code with HMAC Signature

**Choice**: QR payload = `{restaurant_id, table_id, timestamp, signature}` where signature = HMAC-SHA256(table_id + restaurant_id + timestamp, secret).

**Alternatives considered**:
- Plain JSON in QR (no signature): anyone can forge table IDs
- JWT in QR (overkill): large payload, unnecessary claims

**Rationale**: Prevents customers from fabricating table IDs to place orders at wrong tables. HMAC is lightweight, constant-time to verify, and doesn't require a database lookup.

---

### Decision: Pix via Mercado Pago + Stripe for Cards

**Choice**: Mercado Pago SDK for Pix; Stripe Elements for card payments.

**Alternatives considered**:
- Single provider for both: fewer integrations but potentially higher fees
- Pagar.me: good but smaller ecosystem than Stripe/Mercado Pago

**Rationale**: Mercado Pago dominates Brazilian Pix ecosystem; Stripe has best-in-class card processing with global reach. Each handles their domain well with mature web SDKs.

---

### Decision: Supabase Edge Functions for Payment Webhooks

**Choice**: Payment webhook handlers run as Supabase Edge Functions, not Next.js API routes.

**Alternatives considered**:
- Next.js API routes for webhooks: simpler but runs in same process as frontend
- Separate cloud function service: additional infrastructure

**Rationale**: Edge Functions run at the edge (low latency), scale automatically, and are isolated from the Next.js app. Supabase RLS still applies for database writes within the function.

---

## Data Flow

### Order Creation Flow

```
Customer                     App                        Supabase
   │                          │                            │
   │  1. Scan QR → /menu       │                            │
   │─────────────────────────>│                            │
   │                          │  2. Validate QR signature   │
   │                          │────────────────────────────>│
   │                          │  3. Fetch menu (cached)     │
   │                          │<────────────────────────────│
   │  4. Display menu         │                            │
   │<─────────────────────────│                            │
   │                          │                            │
   │  5. Add to cart → IndexedDB│                          │
   │─────────────────────────>│                            │
   │  6. Checkout (online)    │                            │
   │─────────────────────────>│                            │
   │                          │  7. POST /api/orders        │
   │                          │────────────────────────────>│
   │                          │  8. Insert order + items    │
   │                          │<────────────────────────────│
   │  9. pending_payment       │                            │
   │<─────────────────────────│                            │
```

### Payment Flow (Pix)

```
Customer                     Backend                     Mercado Pago
   │                          │                              │
   │  1. Confirm Pix → POST /api/payments/pix               │
   │─────────────────────────>│                              │
   │                          │  2. Create Pix charge        │
   │                          │────────────────────────────>│
   │                          │  3. QR code + expires_at     │
   │                          │<────────────────────────────│
   │  4. QR code displayed    │                              │
   │<─────────────────────────│                              │
   │                          │                              │
   │  (poll every 3s)         │                              │
   │─────────────────────────>│                              │
   │                          │  4. Check payment status      │
   │                          │────────────────────────────>│
   │                          │  5. Status response          │
   │                          │<────────────────────────────│
   │  (repeat until paid or timeout)                          │
   │                          │                              │
   │                    Webhook callback                     │
   │<────────────────────────────────────────────────────────│
   │                          │                              │
   │  6. Update order → paid  │                              │
   │                          │────────────────────────────>│
   │                          │  7. Supabase realtime emit   │
   │                          │<────────────────────────────│
   │                          │                              │
```

### Offline Sync Flow

```
Customer (Offline)           Service Worker               IndexedDB
   │                          │                              │
   │  1. Submit order         │                              │
   │─────────────────────────>│                              │
   │                          │  2. POST /api/orders (fail)  │
   │                          │────────────────────────────>│
   │                          │  3. Queue order with         │
   │                          │     status: pending_sync     │
   │                          │────────────────────────────>│
   │  4. "Order queued" toast  │                              │
   │<─────────────────────────│                              │
   │                          │                              │
   │                  Network reconnects                     │
   │                          │                              │
   │                          │  5. Background Sync event    │
   │                          │────────────────────────────>│
   │                          │  6. Read pending_sync orders │
   │                          │<────────────────────────────│
   │                          │  7. POST /api/orders (retry) │
   │                          │────────────────────────────>│
   │                          │  8. Success → remove from queue│
   │                          │────────────────────────────>│
   │                          │                              │
   │  9. "Order confirmed"     │                              │
   │<─────────────────────────│                              │
```

---

## File Changes

### New Files (by domain)

#### Infrastructure
```
apps/web/
├── public/
│   ├── sw.js                          # Service Worker (Workbox)
│   └── manifest.json                   # PWA manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with providers
│   │   ├── providers.tsx              # React Query + Zustand providers
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   ├── server.ts              # Server Supabase client
│   │   │   └── types.ts               # Generated Supabase types
│   │   ├── offline/
│   │   │   ├── db.ts                 # IndexedDB (Dexie) setup
│   │   │   ├── sync.ts               # Background sync logic
│   │   │   └── cache.ts              # Menu cache operations
│   │   ├── qr/
│   │   │   ├── generator.ts           # QR code generation
│   │   │   └── validator.ts          # QR signature validation
│   │   └── utils.ts
│   └── types/
│       └── index.ts                    # Shared TypeScript types
```

#### Auth Domain
```
apps/web/src/app/(admin)/
├── (auth)/
│   └── login/
│       └── page.tsx
apps/web/src/hooks/
├── useAuth.ts
├── useRole.ts
apps/web/src/components/
├── auth/
│   ├── LoginForm.tsx
│   └── ProtectedRoute.tsx
apps/web/src/lib/
└── supabase/
    └── auth.ts                        # Auth helpers
```

#### Menu Domain
```
apps/web/src/app/(customer)/
├── menu/
│   ├── page.tsx                      # Category list
│   └── [categoryId]/
│       └── page.tsx                  # Products in category
├── product/
│   └── [productId]/
│       └── page.tsx                  # Product detail + modifiers
apps/web/src/components/
├── menu/
│   ├── CategoryList.tsx
│   ├── CategoryCard.tsx
│   ├── ProductList.tsx
│   ├── ProductCard.tsx
│   ├── ProductDetail.tsx
│   ├── ModifierSelector.tsx
│   └── DietaryFilter.tsx
apps/web/src/hooks/
├── useMenu.ts
├── useCategories.ts
├── useProducts.ts
apps/web/src/stores/
└── menuStore.ts                      # Zustand menu state
```

#### Cart Domain
```
apps/web/src/app/(customer)/
├── cart/
│   └── page.tsx
apps/web/src/components/
├── cart/
│   ├── CartDrawer.tsx
│   ├── CartItem.tsx
│   ├── CartSummary.tsx
│   └── CartBadge.tsx
apps/web/src/hooks/
├── useCart.ts
apps/web/src/stores/
└── cartStore.ts                      # Zustand cart (IndexedDB-persisted)
```

#### Order Domain
```
apps/web/src/app/(customer)/
├── checkout/
│   └── page.tsx
├── order/
│   └── [orderId]/
│       └── page.tsx                  # Order confirmation / history
apps/web/src/app/(waiter)/
├── dashboard/
│   └── page.tsx                      # Kitchen display + waiter view
apps/web/src/components/
├── checkout/
│   ├── CheckoutForm.tsx
│   ├── PaymentMethodSelector.tsx
│   └── PixQRCode.tsx
├── order/
│   ├── OrderStatus.tsx
│   ├── OrderHistory.tsx
│   └── OrderDetail.tsx
├── waiter/
│   ├── WaiterDashboard.tsx
│   ├── KitchenDisplay.tsx
│   └── OrderNotification.tsx
apps/web/src/hooks/
├── useOrders.ts
├── useWaiterOrders.ts
apps/web/src/stores/
└── orderStore.ts
apps/web/src/services/
└── orderService.ts
```

#### Payment Domain
```
apps/web/src/app/api/
├── payments/
│   ├── pix/
│   │   ├── create/route.ts           # POST: create Pix charge
│   │   └── status/route.ts           # GET: check Pix status
│   └── stripe/
│       ├── create-intent/route.ts     # POST: create PaymentIntent
│       └── webhook/route.ts          # POST: Stripe webhook
supabase/
└── functions/
    ├── pix-webhook/                   # Mercado Pago webhook handler
    └── stripe-webhook/                # Stripe webhook handler
apps/web/src/components/
├── payment/
│   ├── StripeCardForm.tsx
│   └── PaymentStatus.tsx
apps/web/src/hooks/
└── usePayment.ts
apps/web/src/services/
└── paymentService.ts
```

#### Table Domain
```
apps/web/src/app/api/
└── tables/
    └── validate/route.ts             # POST: validate QR payload
apps/web/src/components/
├── table/
│   ├── TableQRCode.tsx
│   └── TableSelector.tsx
apps/web/src/hooks/
└── useTable.ts
apps/web/src/services/
└── tableService.ts
```

#### Admin Domain
```
apps/web/src/app/(admin)/
├── dashboard/
│   └── page.tsx
├── categories/
│   ├── page.tsx                      # Category list
│   └── [id]/
│       └── page.tsx                  # Category edit
├── products/
│   ├── page.tsx                      # Product list
│   └── [id]/
│       └── page.tsx                  # Product edit
├── modifiers/
│   └── page.tsx
├── combos/
│   └── page.tsx
├── tables/
│   ├── page.tsx                      # Table list + QR generation
│   └── [id]/
│       └── page.tsx
├── orders/
│   ├── page.tsx                      # Order list with filters
│   └── [id]/
│       └── page.tsx                  # Order detail
└── analytics/
    └── page.tsx
apps/web/src/components/
├── admin/
│   ├── AdminLayout.tsx
│   ├── CategoryForm.tsx
│   ├── ProductForm.tsx
│   ├── ModifierGroupForm.tsx
│   ├── ComboForm.tsx
│   ├── TableManagement.tsx
│   ├── OrderList.tsx
│   ├── OrderDetailAdmin.tsx
│   └── AnalyticsDashboard.tsx
```

#### Testing
```
apps/web/src/tests/
├── unit/
│   ├── services/
│   │   ├── orderService.test.ts
│   │   ├── paymentService.test.ts
│   │   └── tableService.test.ts
│   ├── stores/
│   │   ├── cartStore.test.ts
│   │   └── menuStore.test.ts
│   └── lib/
│       ├── qr.test.ts
│       └── offline.test.ts
├── integration/
│   └── api/
│       ├── orders.test.ts
│       └── payments.test.ts
apps/e2e/
├── features/
│   ├── menu.feature
│   ├── cart.feature
│   ├── checkout.feature
│   ├── order.feature
│   ├── payment.feature
│   ├── admin-categories.feature
│   ├── admin-products.feature
│   ├── admin-orders.feature
│   ├── waiter-mode.feature
│   ├── offline-order.feature
│   └── table-qr.feature
├── steps/
│   ├── menu.steps.ts
│   ├── cart.steps.ts
│   ├── checkout.steps.ts
│   ├── order.steps.ts
│   ├── payment.steps.ts
│   ├── admin.steps.ts
│   └── offline.steps.ts
└── pages/
    ├── MenuPage.ts
    ├── CartPage.ts
    ├── CheckoutPage.ts
    ├── OrderPage.ts
    ├── AdminLoginPage.ts
    ├── AdminDashboardPage.ts
    └── WaiterDashboardPage.ts
```

### Database Schema (Supabase)

```sql
-- restaurants (tenant root)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  pix_config JSONB,  -- {merchant_token, callback_url}
  stripe_config JSONB,  -- {publishable_key, secret_key, webhook_secret}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- users_profiles (extends Supabase auth.users)
CREATE TABLE users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- tables
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  label TEXT NOT NULL,
  qr_code_url TEXT,
  qr_signature TEXT,  -- HMAC signature
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  dietary_labels TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- modifier_groups
CREATE TABLE modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) NOT NULL,
  name TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- modifier_values
CREATE TABLE modifier_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_group_id UUID REFERENCES modifier_groups(id) NOT NULL,
  name TEXT NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- combos
CREATE TABLE combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  name TEXT NOT NULL,
  bundle_price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- combo_items
CREATE TABLE combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID REFERENCES combos(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER DEFAULT 1,
  modifier_group_id UUID REFERENCES modifier_groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  table_id UUID REFERENCES tables(id) NOT NULL,
  customer_id UUID REFERENCES auth.users(id),  -- NULL for guest
  status TEXT NOT NULL CHECK (status IN (
    'pending_payment', 'paid', 'received', 'preparing',
    'ready', 'delivered', 'rejected', 'cancelled', 'refunded',
    'payment_failed', 'payment_timeout'
  )),
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('pix', 'card')),
  payment_ext_id TEXT,  -- Mercado Pago ID or Stripe PaymentIntent ID
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  product_id UUID REFERENCES products(id),
  combo_id UUID REFERENCES combos(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  modifiers_json JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_status_history
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- RLS Policies
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their restaurant's data
CREATE POLICY "Users access own restaurant" ON restaurants
  FOR ALL USING (id IN (
    SELECT restaurant_id FROM users_profiles WHERE id = auth.uid()
  ));

-- Similar policies for all tables...
```

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Admin login | Public |
| POST | `/api/auth/logout` | Admin logout | Admin |
| GET | `/api/menu` | Get full menu (categories + products + modifiers) | Public |
| GET | `/api/menu/categories` | Get categories | Public |
| GET | `/api/menu/products/[id]` | Get product detail | Public |
| POST | `/api/tables/validate` | Validate QR code signature | Public |
| POST | `/api/orders` | Create order | Public (guest OK) |
| GET | `/api/orders/[id]` | Get order detail | Public (owner/customer) |
| PATCH | `/api/orders/[id]/status` | Update order status | Admin/Waiter |
| POST | `/api/payments/pix/create` | Create Pix charge | Public |
| GET | `/api/payments/pix/status/[orderId]` | Check Pix status | Public |
| POST | `/api/payments/stripe/create-intent` | Create PaymentIntent | Public |
| POST | `/api/payments/stripe/webhook` | Stripe webhook | Stripe |
| GET | `/api/admin/orders` | List orders (with filters) | Admin |
| CRUD | `/api/admin/categories/*` | Category management | Admin |
| CRUD | `/api/admin/products/*` | Product management | Admin |
| CRUD | `/api/admin/modifiers/*` | Modifier management | Admin |
| CRUD | `/api/admin/combos/*` | Combo management | Admin |
| CRUD | `/api/admin/tables/*` | Table + QR management | Admin |
| GET | `/api/admin/analytics` | Analytics data | Admin |

---

## Component Inventory

### Customer Components

| Component | States | Notes |
|-----------|--------|-------|
| `CategoryList` | loading, empty, populated | Grid of category cards |
| `CategoryCard` | default, hover | Image + name + description |
| `ProductList` | loading, empty, filtered, populated | Grid with dietary filter bar |
| `ProductCard` | default, hover, out-of-stock | Image + name + price + labels |
| `ProductDetail` | default, loading | Full product view with modifiers |
| `ModifierSelector` | default, error (required not selected) | Checkbox/radio group |
| `DietaryFilter` | default | Chip toggles for vegan, gluten-free, etc. |
| `CartBadge` | hidden (0), visible | Floating badge count |
| `CartDrawer` | closed, open | Slide-in with cart items |
| `CartItem` | default, updating, removing | Quantity controls + line total |
| `CartSummary` | default | Subtotal, total, checkout button |
| `CheckoutForm` | default, validating, error | Address confirmation if needed |
| `PaymentMethodSelector` | default | Pix / Card toggle |
| `PixQRCode` | loading, ready, expired, paid | Animated QR with countdown |
| `StripeCardForm` | default, processing, error, success | Stripe Elements |
| `OrderStatus` | pending_payment, paid, preparing, ready, delivered, rejected | Real-time updates |
| `OrderConfirmation` | default | Success screen with order ID |
| `OrderHistory` | loading, empty, populated | List of past orders |
| `OrderDetail` | default, loading | Full order with items + history |

### Admin Components

| Component | States | Notes |
|-----------|--------|-------|
| `AdminLayout` | default | Sidebar + header |
| `LoginForm` | default, loading, error | Email + password |
| `ProtectedRoute` | checking, allowed, denied | Redirect logic |
| `CategoryForm` | create, edit, saving, error | Name + description + order |
| `ProductForm` | create, edit, saving, error | Full product fields + image upload |
| `ModifierGroupForm` | default | Name + required + min/max |
| `ComboForm` | default | Bundle pricing + product links |
| `TableManagement` | default | List + QR download + regenerate |
| `OrderList` | loading, empty, filtered, populated | Filters: status, date range |
| `OrderDetailAdmin` | default | Full order + status history + actions |
| `AnalyticsDashboard` | loading, populated | Charts: orders, revenue, popular items |
| `KitchenDisplay` | loading, empty, populated | Orders sorted by age |

### Shared Components

| Component | Notes |
|-----------|-------|
| `OfflineIndicator` | Shows when `navigator.onLine` is false |
| `SyncStatus` | Shows pending sync count |
| `LoadingSpinner` | Consistent loading state |
| `ErrorMessage` | Consistent error display |
| `ConfirmDialog` | Reusable confirmation modal |
| `Toast` | Notification system |

---

## Testing Strategy

### Unit Tests (Vitest)
- **Coverage target**: ≥80% for services, hooks, stores
- **What to test**:
  - `cartStore`: add/remove/update/clear operations, price calculations
  - `menuStore`: filtering, search logic
  - `orderService`: order creation, status transitions
  - `paymentService`: Pix/ Stripe payload creation
  - `qrValidator`: signature generation and validation
  - `offline/sync`: queue/dequeue logic, retry logic

### Integration Tests
- API route handlers with mocked Supabase
- IndexedDB operations with Dexie test utilities
- Service Worker with Workbox test utilities

### E2E Tests (Playwright + Cucumber)

| Feature | Critical Scenarios |
|---------|-------------------|
| Menu Browse | Category → Product → Add to cart |
| Cart | Add → Update quantity → Remove |
| Checkout | Cart → Select payment → Confirm |
| Pix Payment | Create → QR displayed → Webhook → Paid |
| Stripe Payment | Create → Card form → Pay → Confirmed |
| Offline Order | Go offline → Order → Queue → Reconenct → Sync |
| Admin CRUD | Create/Edit/Delete categories, products, modifiers |
| Table QR | Generate → Scan → Validate → Menu loads |
| Waiter Mode | New order → Notification → Accept → Update |
| Kitchen Display | Orders appear → Mark ready → Disappears |

### Test Commands
```bash
# Unit tests
pnpm --filter web test:unit

# E2E tests
pnpm --filter e2e test

# Coverage
pnpm --filter web test:coverage
```

---

## Migration / Rollout

### Phase 1: Infrastructure (1 sprint)
1. Set up Next.js app with TypeScript, folder structure
2. Configure Supabase project + schema migrations
3. Implement Service Worker with Workbox
4. Set up IndexedDB with Dexie
5. Implement Supabase Auth flow

### Phase 2: Customer Flow (2 sprints)
1. Menu browsing (categories → products → detail)
2. Cart operations with IndexedDB persistence
3. Order creation API
4. Checkout flow with payment integration
5. Order confirmation + history

### Phase 3: Admin + Waiter (2 sprints)
1. Admin authentication + protected routes
2. Category/Product/Modifier CRUD
3. Table management + QR generation
4. Order management dashboard
5. Kitchen display + waiter notifications

### Phase 4: Offline + Polish (1 sprint)
1. Background sync for queued orders
2. Connectivity status UI
3. PWA manifest + installability
4. Performance optimization
5. E2E test completion

### Feature Flags
```
NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED=true
NEXT_PUBLIC_FEATURE_PIX_ENABLED=true
NEXT_PUBLIC_FEATURE_STRIPE_ENABLED=true
NEXT_PUBLIC_FEATURE_WAITER_MODE=true
```

---

## Open Questions

1. **Image storage**: Supabase Storage vs external CDN (Cloudinary/Imgix)? Decision: Supabase Storage initially, CDN migration path if performance requires.

2. **Menu cache TTL**: How long before stale menu data is unacceptable? Proposed: 1 hour max-age, force refresh on admin menu save.

3. **Order idempotency**: Should we use idempotency keys for order creation to prevent duplicates on retry? Yes, generate `order_idempotency_key` from cart hash + timestamp.

4. **Multi-tab cart sync**: If customer opens app in multiple tabs, should carts stay in sync? Proposed: BroadcastChannel API to sync cart state between tabs.

5. **Webhook reliability**: What if both Pix webhook and polling fail? Escalate to manual verification after 3 retries, flag for admin review.
