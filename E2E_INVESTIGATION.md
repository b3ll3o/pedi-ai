# E2E Test Investigation - Session Summary

## Date: 2026-04-30
## Project: pedi-ai

---

## Current State
- **Test Results**: 16 passed / 10 failed (smoke tests)
- **Same as baseline**: The number of failures hasn't improved despite multiple fixes

---

## Root Cause Identified

### Auth Session Not Persisting on Navigation

After login via `performLogin`, the session appears valid initially. But when the user navigates to a second page (e.g., from menu to checkout), the middleware (`proxy.ts`) cannot find the session even though cookies are set.

**Affected flows**:
- Checkout: Redirects to `/cart` (because cart has items with R$ 0.00 price - partially fixed)
- Table QR Redirect: Redirects to `/login` instead of `/menu`
- Register Owner Redirect: Redirects to `/menu` instead of `/admin/restaurants/new`
- Order Tracking: Order not found
- Admin Analytics/Orders: Flaky timeouts (data loading issues)

**Passing flows**:
- Direct login/logout (no intermediate navigation)
- Menu display (single page)
- Register (no session reuse)

---

## Issues Found and Fixes Applied

### 1. proxy.ts - Uses getSession() instead of getUser() (FIXED)
- **Problem**: `getSession()` just reads stored session, doesn't validate JWT
- **Fix**: Changed to `getUser()` which validates the JWT
- **Status**: FIXED but not resolving admin login issues

### 2. AdminAnalyticsPage.ts - Wrong Locator Type (FIXED)
- **Problem**: Locators were looking for `button` elements but AdminLayout uses Next.js `Link` components (rendered as `<a>`)
- **Fix**: Changed locators from `button` to `a`
- **Status**: FIXED but admin tests still fail due to login issue

### 3. StoreProvider.tsx - IndexedDB Hydration Overwrites Cart (FIXED)
- **Problem**: `hydrateCartFromIndexedDB()` was called on every page load, overwriting cart items with `unitPrice: 0`
- **Fix**: Added check to only hydrate if localStorage doesn't have cart data
- **Status**: FIXED - cart now shows correct prices (R$ 5,99 for Coca-Cola)

### 4. CheckoutClient.tsx - Wrong CheckoutForm Import (FIXED)
- **Problem**: `CheckoutClient` was importing simple `CheckoutForm` from `./CheckoutForm` instead of full-featured version from `@/components/checkout/CheckoutForm`
- **Fix**: Changed import and added required props (items, subtotal, tax, total, onSubmit)
- **Status**: PARTIALLY FIXED - form integration still has issues

### 5. CheckoutForm.tsx - Missing Props (PARTIAL)
- **Problem**: `CheckoutForm` component expects props but was being called without them
- **Fix**: Updated `CheckoutClient` to calculate and pass props
- **Status**: Needs testing

### 6. picsum.photos not configured (FIXED)
- **Problem**: `next.config.ts` didn't have remotePatterns for picsum.photos
- **Fix**: Added `remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }]`
- **Status**: FIXED in previous session

---

## Issues NOT Fully Resolved

### 1. Admin Login Still Failing
- **Symptom**: "Invalid login credentials" error even with correct credentials
- **Analysis**: Supabase auth accepts credentials but subsequent page loads don't recognize session
- **Next Steps**:
  - Check if cookies are being set correctly with proper flags
  - Verify Supabase client configuration in browser vs server
  - Consider if RLS policies are blocking profile queries

### 2. Checkout Form Not Rendering Customer Fields
- **Symptom**: Cart shows correct prices but customer form fields (name, phone) not visible
- **Analysis**: The `CheckoutForm` from `@/components/checkout/` has customer fields but they may not be rendering
- **Next Steps**:
  - Verify the component is rendering correctly
  - Check if CSS is hiding elements
  - Debug component integration

### 3. Order Creation Failing
- **Symptom**: "Failed to create order items" - 500 Internal Server Error
- **Analysis**: The API route `/api/orders` is failing when inserting order items
- **Next Steps**:
  - Check if `order_items` table schema matches what's being inserted
  - Verify RLS policies allow the insert
  - Debug the actual error message from Supabase

---

## Files Changed (This Session)

```bash
src/proxy.ts                                          | Uses getUser() instead of getSession()
tests/e2e/pages/AdminAnalyticsPage.ts                  | Changed locators from button to a
src/components/providers/StoreProvider.tsx              | Only hydrate from IndexedDB if no localStorage
src/app/(customer)/checkout/CheckoutClient.tsx         | Import correct CheckoutForm, pass props
```

---

## Running Tests

```bash
# Full smoke test
rm -rf .playwright tests/e2e/scripts/.seed-result.json
pnpm test:e2e:seed && rm -rf .playwright && pnpm test:e2e:smoke

# Kill stuck dev servers
killall -9 node
```

---

## Key Discoveries

1. **Two CheckoutForm components exist**:
   - `src/app/(customer)/checkout/CheckoutForm.tsx` - simple version (no customer fields)
   - `src/components/checkout/CheckoutForm.tsx` - full version (with customer fields)
   - `CheckoutClient` was importing the simple version

2. **StoreProvider hydration issue**: Calling `hydrateCartFromIndexedDB()` on every page load was overwriting cart items with corrupted data (unitPrice: 0)

3. **Admin locators**: AdminLayout uses Next.js `Link` components, not `button` elements
