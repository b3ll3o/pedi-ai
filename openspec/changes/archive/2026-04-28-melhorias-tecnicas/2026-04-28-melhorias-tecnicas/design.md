# Design: Melhorias Técnicas de Performance e Segurança

## Technical Approach

Implementar 4 melhorias técnicas independentes para resolver problemas de compatibilidade mobile, segurança de QR codes, performance de realtime e experiência offline.

## Architecture Decisions

### Decision: Safe Area CSS Using env()

**Choice**: Use CSS `env(safe-area-inset-*)` with max() fallback

**Alternatives considered**:
- Using JavaScript to detect safe area — adds complexity
- Hardcoded padding values — doesn't adapt to different devices

**Rationale**: CSS `env()` is the standard way to handle iOS safe areas and provides automatic adaptation to device geometry.

---

### Decision: Nonce Generation Using crypto.randomUUID()

**Choice**: Use `crypto.randomUUID()` for nonce generation

**Alternatives considered**:
- `Math.random()` — not cryptographically secure
- Custom UUID v4 implementation — unnecessary

**Rationale**: `crypto.randomUUID()` is built into Node.js 16.17+ and provides cryptographically secure random values.

---

### Decision: 4-Hour QR Expiry

**Choice**: Reduce QR code expiry from 24h to 4h

**Alternatives considered**:
- Keep 24h — less secure
- Reduce to 1h — may be too short for long meals

**Rationale**: 4 hours covers most dining scenarios while reducing the window for replay attacks.

---

### Decision: CacheFirst Strategy for Offline Page

**Choice**: Use Workbox `CacheFirst` strategy for offline.html

**Alternatives considered**:
- NetworkFirst — would require network even when offline
- StaleWhileRevalidate — adds complexity without benefit for static page

**Rationale**: Offline page is static and should be served from cache immediately when offline.

---

## File Changes

### Mobile PWA
- **MODIFY**: `src/app/_document.tsx` — add viewport-fit=cover
- **MODIFY**: `src/styles/globals.css` — add safe-area CSS custom properties
- **CREATE**: `src/hooks/usePWAInstall.ts` — hook to capture beforeinstallprompt

### QR Security
- **MODIFY**: `src/lib/qr.ts` — add nonce and expiry to payload
- **MODIFY**: `src/lib/qr-validator.ts` — validate nonce and expiry

### Realtime
- **MODIFY**: `src/lib/supabase.ts` — update subscriptions to use specific events

### Offline
- **CREATE**: `public/offline.html` — custom offline page
- **MODIFY**: `src/lib/sw.ts` — cache offline.html

## Data Flow

### QR Code Generation with Nonce
```
QRPayload = {
  mesaId: string,
  timestamp: number,
  nonce: crypto.randomUUID(),
  expiry: Date.now() + (4 * 60 * 60 * 1000)
}
→ QRCode.generate(QRPayload)
→ QRCode.toDataURL()
```

### QR Validation with Nonce Check
```
QRCode.scan()
→ QRPayload.decode()
→ validateNonce(payload.nonce) // crypto.randomUUID format
→ validateExpiry(payload.expiry) // < 4 hours
→ if valid: resolve(mesaId)
→ if invalid: reject('QR_CODE_INVALID')
```

## Testing Strategy

1. **Unit tests** for QR nonce generation and validation
2. **Visual tests** for safe-area on iOS simulator
3. **Manual tests** for PWA install prompt
4. **Playwright offline tests** for offline.html rendering

## Migration / Rollback

### QR Nonce Backward Compatibility
- QR codes without nonce are accepted for 24h grace period
- After grace period, only QR codes with nonce are accepted

### Rollback Plan
1. **Safe-area**: Remove `viewport-fit=cover` — single meta tag change
2. **QR Nonce**: Disable nonce validation — single config flag
3. **Realtime**: Revert to `event: '*'` — single line change per subscription
4. **Offline**: Remove offline.html cache registration — single block in sw.ts
