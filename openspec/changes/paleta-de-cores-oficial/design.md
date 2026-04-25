# Design: Paleta de Cores Oficial do Pedi-AI

## Technical Approach

### Migration Strategy

The migration follows a **"define then replace"** approach:

1. **Phase 1 (Infrastructure)**: Define all CSS Custom Properties in `globals.css` with light/dark theme support
2. **Phase 2 (Migration)**: Replace hardcoded hex colors in `.module.css` files with CSS variable references
3. **Phase 3 (Verification)**: Validate no hardcoded colors remain and test both themes

### Backwards Compatibility Layer

Some CSS modules already define local `--color-*` variables with fallbacks (e.g., `var(--text-primary, #171717)`). These local definitions will be gradually removed as globals are updated. The migration preserves existing fallbacks during transition to prevent breakage.

### Color Mapping Strategy

| Original Color | Target Token | Notes |
|----------------|--------------|-------|
| `#667eea`, `#764ba2`, `#4f46e5`, `#5b21b6`, `#3b82f6`, `#2563eb`, `#1d4ed8` | `--color-primary` | Blue/purple gradients → warm orange |
| `#e67e22`, `#d35400`, `#f5a623`, `#f39c12` | `--color-primary` / `--color-primary-light` / `--color-primary-dark` | Already orange palette |
| `#27ae60`, `#16a34a`, `#15803d`, `#22c55e`, `#059669`, `#166534` | `--color-secondary` / `--color-success` | Green variations → secondary green |
| `#dc2626`, `#ef4444`, `#f87171`, `#991b1b`, `#b91c1c` | `--color-error` | Red for errors |
| `#f59e0b`, `#d97706` | `--color-warning` | Amber for warnings |
| `#0284c7`, `#60a5fa`, `#3399ff` | `--color-info` | Blue for info |
| `#ffffff`, `#fff` (backgrounds) | `--color-surface` | White surfaces |
| `#f8f9fc`, `#f5f5f5`, `#fafafa`, `#f3f4f6`, `#f0fdf4`, `#fef2f2`, `#eff6ff`, `#ecfdf5`, `#fef3c7` | `--color-surface-elevated` or `--color-background` | Light backgrounds |
| `#1a1a1a`, `#0a0a0a`, `#121212`, `#0f0f0f` (dark backgrounds) | Dark mode `--color-dark-surface` | Dark surfaces |
| `#171717`, `#111827`, `#1a1a2e`, `#333`, `#374151` | `--color-text-primary` | Dark text |
| `#6b7280`, `#666`, `#999`, `#9ca3af`, `#a8a29e` | `--color-text-secondary` | Muted text |
| `#d1d5db`, `#e5e5e5`, `#e5e7eb`, `#e7e5e4`, `#d6d3d1`, `#ebebeb` | `--color-border` | Border colors |

## Architecture Decisions

### Decision: Global CSS Variables with Dark Mode Override
**Choice**: Define all tokens in `:root` and override in `[data-theme="dark"]` / `@media (prefers-color-scheme: dark)`
**Alternatives considered**: CSS modules with local variables, CSS-in-JS, Tailwind config
**Rationale**: Native CSS cascade enables dark mode without JavaScript, works with Service Worker caching, no build step changes needed.

### Decision: Remove Local CSS Module Variables from `page.module.css`
**Choice**: Remove the `.page` class local `--color-*` definitions and rely on globals
**Alternatives considered**: Keep local variables with `--color-primary: var(--color-primary)` references
**Rationale**: Eliminates duplication and ensures consistent token resolution across all components.

### Decision: Keep Fallback Values During Migration
**Choice**: `var(--color-primary, #E85D04)` pattern during transition
**Alternatives considered**: Direct `var(--color-primary)` only
**Rationale**: Provides safety net if globals haven't loaded yet; enables incremental rollout without broken UI states.

### Decision: Gradient Tokens for CTAs
**Choice**: Define `--gradient-primary` and `--gradient-warm` as CSS custom properties
**Alternatives considered**: Inline gradient values in components
**Rationale**: Consistent gradient usage across all CTAs; single point of change if brand colors evolve.

### Decision: Keep Purple-Blue Gradient for Auth Pages
**Choice**: Manter gradiente purple-blue (#667eea → #764ba2) para login e register
**Alternatives considered**: Substituir por gradiente orange (--gradient-primary)
**Rationale**: Autenticação tem identidade visual distinta; convenção da indústria para formulários de login; melhor diferenciação UX entre páginas públicas e auth.

### Decision: Add `--color-accent` Token
**Choice**: Adicionar `--color-accent` como token separado de `--color-error`
**Value**: `--color-accent: #DC2626`, `--color-accent-light: #EF4444`, `--color-accent-dark: #B91C1C`
**Alternatives considered**: Mapear para `--color-error` ou `--color-primary`
**Rationale**: Error red (#DC2626) semanticamente significa "erro", não "destaque". Accent é para ênfase visual, tags, badges - não deve conflitar com estados de erro.

## File Changes

### Files to Modify (61 total)

**Core Design System (1 file):**
- `src/app/globals.css` — Define all CSS Custom Properties with light/dark themes

**App-Level Page Modules (17 files):**
- `src/app/page.module.css`
- `src/app/login/page.module.css`
- `src/app/register/page.module.css`
- `src/app/kitchen/page.module.css`
- `src/app/table/[code]/page.module.css`
- `src/app/admin/dashboard/page.module.css`
- `src/app/admin/login/page.module.css`
- `src/app/admin/categories/page.module.css`
- `src/app/admin/categories/[id]/page.module.css`
- `src/app/admin/products/page.module.css`
- `src/app/admin/products/[id]/page.module.css`
- `src/app/admin/tables/page.module.css`
- `src/app/admin/tables/[id]/page.module.css`
- `src/app/admin/combos/page.module.css`
- `src/app/admin/modifiers/page.module.css`
- `src/app/admin/configuracoes/page.module.css`
- `src/app/admin/orders/page.module.css`

**Customer Page Modules (6 files):**
- `src/app/(customer)/menu/page.module.css`
- `src/app/(customer)/menu/[categoryId]/page.module.css`
- `src/app/(customer)/cart/page.module.css`
- `src/app/(customer)/checkout/page.module.css`
- `src/app/(customer)/product/[productId]/page.module.css`

**Component Modules (37 files):**
- `src/components/menu/ProductCard.module.css`
- `src/components/menu/CategoryCard.module.css`
- `src/components/menu/CategoryList.module.css`
- `src/components/menu/ProductList.module.css`
- `src/components/menu/ProductDetail.module.css`
- `src/components/menu/SearchBar.module.css`
- `src/components/menu/ModifierSelector.module.css`
- `src/components/menu/DietaryFilter.module.css`
- `src/components/cart/CartItem.module.css`
- `src/components/cart/CartSummary.module.css`
- `src/components/cart/CartDrawer.module.css`
- `src/components/cart/CartBadge.module.css`
- `src/components/checkout/CheckoutForm.module.css`
- `src/components/checkout/PaymentMethodSelector.module.css`
- `src/components/auth/LoginForm.module.css`
- `src/components/auth/RegisterForm.module.css`
- `src/components/admin/AdminLayout.module.css`
- `src/components/admin/CategoryList.module.css`
- `src/components/admin/CategoryForm.module.css`
- `src/components/admin/ProductList.module.css`
- `src/components/admin/ProductForm.module.css`
- `src/components/admin/ComboForm.module.css`
- `src/components/admin/ModifierGroupForm.module.css`
- `src/components/admin/OrderList.module.css`
- `src/components/admin/OrderDetailAdmin.module.css`
- `src/components/admin/TableManagement.module.css`
- `src/components/admin/TableQRCode.module.css`
- `src/components/admin/UserManagement.module.css`
- `src/components/admin/UserForm.module.css`
- `src/components/kitchen/KitchenDisplay.module.css`
- `src/components/kitchen/ConnectionStatus.module.css`
- `src/components/kitchen/WaiterDashboard.module.css`
- `src/components/kitchen/OrderNotification.module.css`
- `src/components/order/OrderHistory.module.css`
- `src/components/payment/PixQRCode.module.css`
- `src/components/users/UserManagement.module.css`
- `src/components/users/StaffInviteForm.module.css`
- `src/components/analytics/AnalyticsDashboard.module.css`

### Files NOT Modified (no hardcoded colors detected):
- `src/app/admin/page.module.css` — Does not exist
- All `.tsx`, `.ts`, `.js` files — Color logic handled via CSS

## Interfaces / Contracts

### CSS Custom Property API

```css
/* Light Theme (default) */
:root {
  --color-primary: #E85D04;
  --color-primary-light: #F48C06;
  --color-primary-dark: #D64804;
  --color-secondary: #588157;
  --color-secondary-light: #6A994E;
  --color-secondary-dark: #3A5A40;
  --color-success: #16A34A;
  --color-success-light: #22C55E;
  --color-background: #FFFBF5;
  --color-surface: #FFFFFF;
  --color-surface-elevated: #FFF8F0;
  --color-text-primary: #1C1917;
  --color-text-secondary: #57534E;
  --color-text-tertiary: #A8A29E;
  --color-border: #E7E5E4;
  --color-border-strong: #D6D3D1;
  --color-error: #DC2626;
  --color-error-light: #FEE2E2;
  --color-warning: #F59E0B;
  --color-warning-light: #FEF3C7;
  --color-info: #0284C7;
  --color-info-light: #E0F2FE;
  --color-focus-ring: rgba(232, 93, 4, 0.4);
  --color-accent: #DC2626;
  --color-accent-light: #EF4444;
  --color-accent-dark: #B91C1C;
  --gradient-primary: linear-gradient(135deg, #E85D04 0%, #F48C06 100%);
  --gradient-warm: linear-gradient(135deg, #F48C06 0%, #DC2626 100%);
}

/* Dark Theme */
[data-theme="dark"], @media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1C1917;
    --color-surface: #292524;
    --color-surface-elevated: #44403C;
    --color-text-primary: #FAFAF9;
    --color-text-secondary: #D6D3D1;
    --color-text-tertiary: #78716C;
    --color-border: #44403C;
    --color-border-strong: #57534E;
  }
}
```

### Semantic Color Usage Contract

| Token | Usage | Examples |
|-------|-------|----------|
| `--color-primary` | CTAs, active states, brand elements | Buttons, links, highlights |
| `--color-accent` | Emphasis, destaque, CTAs secundários | Tags, badges especiais, alertas |
| `--color-secondary` | Success indicators, positive states | Check marks, active badges |
| `--color-success` | Success messages, confirmations | Order complete, payment success |
| `--color-error` | Error states, destructive actions | Delete buttons, validation errors |
| `--color-warning` | Warning states | Pending badges, caution messages |
| `--color-info` | Informational states | Info badges, links |
| `--color-surface` | Card backgrounds, inputs | Container backgrounds |
| `--color-surface-elevated` | Elevated cards, modals | Modal backgrounds |
| `--color-text-primary` | Main text content | Headings, body text |
| `--color-text-secondary` | Secondary text, labels | Placeholder text, captions |
| `--color-border` | Borders, dividers | Card borders, input borders |
| `--color-focus-ring` | Keyboard focus indicators | Focus outlines |

## Testing Strategy

### Pre-Migration Validation
1. Run `grep -r "#[0-9A-Fa-f]{3,6}" src/**/*.module.css` to document baseline hardcoded color count
2. Screenshot key pages (landing, menu, cart, checkout, admin) for before/after comparison

### Post-Migration Validation
1. **Build Verification**: `next build` completes without errors
2. **Grep Verification**: `grep -r "#[0-9A-Fa-f]{3,6}" src/**/*.module.css` returns zero matches (excluding gradient hex values `#E85D04`, `#F48C06` in gradients)
3. **Grep for Fallbacks**: `grep -r "var(--" src/**/*.module.css` confirms CSS variable usage
4. **Dark Mode Test**: Toggle `data-theme="dark"` or enable `prefers-color-scheme: dark` in DevTools
5. **Visual Regression**: Compare screenshots of critical paths

### Critical Paths to Verify
- Landing page hero and CTAs
- Menu category navigation
- Product cards with prices
- Cart item list with totals
- Checkout form and payment buttons
- Admin dashboard stats
- Admin tables with status badges
- Kitchen display with order notifications

## Migration / Rollout

### Phase 1: globals.css Update (Day 1)
1. Replace `globals.css` content with full palette definition
2. Add dark mode media query overrides
3. Add `--gradient-primary` and `--gradient-warm`
4. Verify `next build` succeeds

### Phase 2: Landing Page (Day 1-2)
- `src/app/page.module.css` — Remove local `--color-*` vars, use globals
- Replace hardcoded `#ef4444`, `#c0392b` with semantic tokens
- Verify hero, features, pricing, CTA sections

### Phase 3: Customer Pages (Day 2-3)
- `src/app/(customer)/*/page.module.css` (5 files)
- `src/components/menu/*.module.css` (7 files)
- `src/components/cart/*.module.css` (4 files)
- `src/components/checkout/*.module.css` (2 files)

### Phase 4: Admin Pages (Day 3-4)
- `src/app/admin/**/*.module.css` (12 files)
- `src/components/admin/*.module.css` (11 files)
- Focus on status badges and form validation colors

### Phase 5: Remaining Components (Day 4-5)
- Auth forms (login, register)
- Kitchen display components
- Order history, analytics, users
- Payment components

### Rollback Plan
```bash
git revert HEAD --no-commit  # Revert all changes
git commit -m "chore: rollback paleta-de-cores-oficial"
```

## Open Questions

1. ~~**Purple/Blue Gradients**~~: RESOLVIDO - Manter gradiente purple-blue para auth pages (decisão: 4.0 em tasks.md)

2. ~~**`--color-accent` in Spec**~~: RESOLVIDO - Adicionado `--color-accent` como token separado (ver CSS Custom Property API e decisão em Architecture Decisions)

3. **`--color-secondary-light` Usage**: The palette includes `--color-secondary-light: #6A994E` but no spec scenario uses it. Should this be used for "active" states in admin sidebar?

4. **Dark Mode Implementation**: The current codebase uses `@media (prefers-color-scheme: dark)`. Some files use `[data-theme="dark"]` pattern. Should we standardize on one approach, or support both?

5. **Existing Fallback Variables**: Many CSS modules use `var(--some-var, #fallback)` pattern. Should we keep these fallbacks permanently (safer) or remove them once migration is complete (cleaner, forces proper token usage)?
