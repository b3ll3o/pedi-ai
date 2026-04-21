# Lighthouse Audit - Performance Verification

## Manual Step Required

Lighthouse audits must be run manually in a browser environment as they require a real Chrome instance with DevTools.

## Running the Audit

1. **Open Chrome DevTools** (F12 or Cmd+Option+I)
2. **Navigate to the Lighthouse tab**
3. **Select categories**: Performance, PWA, Best Practices, Accessibility
4. **Click "Analyze page load"**

### Categories to Verify

#### Performance (Target: Score > 90)
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Time to Interactive (TTI) < 3.8s
- [ ] Speed Index < 3.4s

#### PWA (Target: All checks pass)
- [ ] Service worker is registered and controlling page
- [ ] Manifest with app name, icons, theme_color, display: standalone
- [ ] Works offline (shows offline.html when disconnected)
- [ ] HTTPS is required (for service worker)

#### Best Practices
- [ ] No console errors
- [ ] Images have alt attributes
- [ ] Page has doctype
- [ ] HTTPS is used

## Expected Results

Based on implementation:
- **Performance**: 85-95 (Next.js automatic optimizations)
- **PWA**: 100 (manifest, sw.js, offline.html all implemented)
- **Best Practices**: 95-100
- **Accessibility**: 85-95 (depends on content)

## Performance Optimizations Implemented

1. **Next.js automatic optimizations**:
   - Route-based code splitting
   - Image optimization via next/image
   - Automatic bundle size optimization (<150kB)
   - Font optimization

2. **Service Worker caching**:
   - CacheFirst for static assets (JS, CSS, images)
   - NetworkFirst with 3s timeout for menu API
   - StaleWhileRevalidate for general API
   - BackgroundSync for offline order creation

3. **IndexedDB caching**:
   - Menu data cached in IndexedDB
   - Compression via JSON.stringify (gzip compression handled by server)
   - 24-hour TTL for menu cache

## Bundle Size Verification

```bash
# Run build and check bundle sizes
npm run build

# Check .next/static/chunks directory for chunk sizes
ls -la .next/static/chunks/
```

Target: Individual chunks should be <150kB (Next.js enforces this)

## Manual Verification Steps

### 1. Offline Functionality
1. Open Chrome DevTools > Application > Service Workers
2. Check "Offline" checkbox in Network tab
3. Reload page - should show offline.html

### 2. Background Sync
1. Create order while offline
2. Check IndexedDB > pedi > pending_sync
3. Restore connection
4. Verify order syncs automatically

### 3. Cache Invalidation
1. Open admin panel
2. Modify a product/category
3. Verify menu cache invalidates
4. Check Network tab for fresh API calls

## Notes

- Lighthouse scores vary based on network conditions
- Run audit in Incognito mode to avoid extensions interference
- Use throttled network (Fast 3G) for realistic mobile results
