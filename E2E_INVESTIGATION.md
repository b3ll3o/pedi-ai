# E2E Test Investigation - Session Summary

## Date: 2026-04-28
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
- Checkout: Redirects to `/cart` (because cart has items with R$ 0.00 price - data issue)
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

### 1. useAuth.ts - Race Condition on Timeout (FIXED)
- **Problem**: Timeout returned `[null, null]` silently, discarding valid sessions
- **Fix**: Added retry logic on timeout before giving up:
```typescript
if (err === TIMEOUT_ERROR) {
  console.warn('Auth init timed out, retrying session check...');
  const retrySession = await getSession().catch(() => null);
  return [retrySession, null];
}
```

### 2. useAuth.ts - isAuthenticated Requires Both session AND user (FIXED)
- **Problem**: `isAuthenticated: !!session && !!user` fails if `getUser()` is slow
- **Fix**: Changed to `isAuthenticated: !!session` (session is ground truth)

### 3. proxy.ts - Uses getSession() instead of getUser() (APPLIED)
- **Problem**: `getSession()` just reads stored session, doesn't validate JWT
- **Fix**: Using `getUser()` which validates the JWT

### 4. Checkout testids swapped (FIXED)
- **Problem**: `CheckoutForm.tsx` had wrong testids (`checkout-email` on name input)
- **Fix**: Corrected to `checkout-name`, `checkout-phone`, `checkout-table-number`

### 5. picsum.photos not configured (FIXED)
- **Problem**: `next.config.ts` didn't have remotePatterns for picsum.photos
- **Fix**: Added `remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }]`

### 6. Auth timeout increased (APPLIED)
- **Problem**: 5s timeout too short for slow networks
- **Fix**: Increased to 10s

---

## Issues Found But NOT Fixed (or reverted)

### 1. Cookie Options in Middleware
- **Attempted**: Adding `httpOnly`, `secure`, `sameSite` to cookies in `middleware.ts`
- **Result**: BROKE tests (18 failed) - reverted
- **Reason**: `httpOnly: true` prevents browser JavaScript from reading auth cookies needed by Supabase client

### 2. Browser Client Cookie Configuration
- **Attempted**: Custom `getAll`/`setAll` in `createBrowserClient()`
- **Result**: BROKE tests - reverted
- **Reason**: Same issue - cookies need to be accessible to JavaScript

---

## Key Discovery: Two Independent Auth Paths

| Layer | File | Method |
|-------|------|--------|
| Server | `proxy.ts` | `getSession()` or `getUser()` |
| Client | `useAuth.ts` | `getSession()` + `getUser()` |

These can disagree during race conditions.

---

## Next Steps to Investigate

1. **Debug cookie flow**: Add logging to verify cookies are set and sent correctly
2. **Check Supabase client version**: Maybe there's a bug with cookie handling
3. **Investigate network blocking**: E2E setup blocks some domains - could affect Supabase auth
4. **Race condition between middleware and client**: Middleware might run before client sets cookies
5. **Admin tests flaky**: Admin analytics/orders timeout - investigate if data is being seeded correctly

---

## Files Changed

```bash
 next.config.ts                                     |   6 +
 src/app/api/admin/analytics/orders/route.ts        |  21 +-
 src/app/api/admin/analytics/popular-items/route.ts |  21 +-
 src/app/api/admin/analytics/route.ts               |  21 +-
 src/app/api/menu/route.ts                         |   8 +-
 src/app/api/orders/route.ts                       |  23 ++-
 ...
 src/hooks/useAuth.ts                              |   2 +-
 src/hooks/useCardapio.ts                         |  22 ++-
 ...
 src/lib/supabase/middleware.ts                    |  10 +-
 tests/e2e/pages/CheckoutPage.ts                    |   4 +-
 tests/e2e/tests/customer/checkout.spec.ts          |   5 +-
 tests/e2e/tests/customer/table-qr-redirect.spec.ts |  34 ++--
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
