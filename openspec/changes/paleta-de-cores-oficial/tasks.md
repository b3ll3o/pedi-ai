# Tasks: Paleta de Cores Oficial do Pedi-AI

## Phase 1: Foundation
- [x] 1.1 Definir CSS Custom Properties da paleta light theme em `src/app/globals.css` (tokens primários, secundários, surface, texto, bordas, status)
- [x] 1.2 Definir CSS Custom Properties da paleta dark theme em `src/app/globals.css` (overrides para `data-theme="dark"` e `prefers-color-scheme: dark`)
- [x] 1.3 Definir gradientes `--gradient-primary` e `--gradient-warm` em `src/app/globals.css`
- [x] 1.4 Definir tokens de cor para estados (error-light, warning-light, info-light) e --color-accent em `src/app/globals.css`
- [x] 1.5 Executar `next build` para verificar que globals.css compila sem erros

## Phase 2: Customer Pages (Landing, Menu, Cart, Checkout)
- [x] 2.1 Substituir cores hardcoded em `src/app/page.module.css` (landing page) por tokens CSS
- [x] 2.2 Substituir cores hardcoded em `src/app/(customer)/menu/page.module.css` por tokens CSS
- [x] 2.3 Substituir cores hardcoded em `src/app/(customer)/menu/[categoryId]/page.module.css` por tokens CSS
- [x] 2.4 Substituir cores hardcoded em `src/app/(customer)/cart/page.module.css` por tokens CSS
- [x] 2.5 Substituir cores hardcoded em `src/app/(customer)/checkout/page.module.css` por tokens CSS
- [x] 2.6 Substituir cores hardcoded em `src/app/(customer)/product/[productId]/page.module.css` por tokens CSS
- [x] 2.7 Substituir cores hardcoded em `src/app/table/[code]/page.module.css` por tokens CSS
- [x] 2.8 Substituir cores hardcoded em `src/components/menu/ProductCard.module.css` por tokens CSS
- [x] 2.9 Substituir cores hardcoded em `src/components/menu/CategoryCard.module.css` por tokens CSS
- [x] 2.10 Substituir cores hardcoded em `src/components/menu/CategoryList.module.css` por tokens CSS
- [x] 2.11 Substituir cores hardcoded em `src/components/menu/ProductList.module.css` por tokens CSS
- [x] 2.12 Substituir cores hardcoded em `src/components/menu/ProductDetail.module.css` por tokens CSS
- [x] 2.13 Substituir cores hardcoded em `src/components/menu/SearchBar.module.css` por tokens CSS
- [x] 2.14 Substituir cores hardcoded em `src/components/menu/ModifierSelector.module.css` por tokens CSS
- [x] 2.15 Substituir cores hardcoded em `src/components/menu/DietaryFilter.module.css` por tokens CSS
- [x] 2.16 Substituir cores hardcoded em `src/components/cart/CartItem.module.css` por tokens CSS
- [x] 2.17 Substituir cores hardcoded em `src/components/cart/CartSummary.module.css` por tokens CSS
- [x] 2.18 Substituir cores hardcoded em `src/components/cart/CartDrawer.module.css` por tokens CSS
- [x] 2.19 Substituir cores hardcoded em `src/components/cart/CartBadge.module.css` por tokens CSS
- [x] 2.20 Substituir cores hardcoded em `src/components/checkout/CheckoutForm.module.css` por tokens CSS
- [x] 2.21 Substituir cores hardcoded em `src/components/checkout/PaymentMethodSelector.module.css` por tokens CSS
- [~] 2.22 Executar `grep -r --include='*.module.css' "#[0-9A-Fa-f]{3,6}" src/app src/components` para verificar zero hardcoded colors remaining (excluindo gradientes em tokens CSS) — PARCIAL: mapping original incompleto, algumas cores não substituídas
- [ ] 2.23 Verificar visualmente landing page (hero, CTAs, features, pricing) — SKIP por enquanto
- [ ] 2.24 Verificar visualmente menu page (category navigation, product cards) — SKIP por enquanto
- [ ] 2.25 Verificar visualmente cart e checkout pages — SKIP por enquanto

## Phase 3: Admin Pages
- [x] 3.1 Substituir cores hardcoded em `src/app/admin/dashboard/page.module.css` por tokens CSS
- [~] 3.2 Substituir cores hardcoded em `src/app/admin/login/page.module.css` por tokens CSS
- [~] 3.3 Substituir cores hardcoded em `src/app/admin/categories/page.module.css` por tokens CSS
- [~] 3.4 Substituir cores hardcoded em `src/app/admin/categories/[id]/page.module.css` por tokens CSS
- [~] 3.5 Substituir cores hardcoded em `src/app/admin/products/page.module.css` por tokens CSS
- [~] 3.6 Substituir cores hardcoded em `src/app/admin/products/[id]/page.module.css` por tokens CSS
- [~] 3.7 Substituir cores hardcoded em `src/app/admin/tables/page.module.css` por tokens CSS
- [~] 3.8 Substituir cores hardcoded em `src/app/admin/tables/[id]/page.module.css` por tokens CSS
- [~] 3.9 Substituir cores hardcoded em `src/app/admin/combos/page.module.css` por tokens CSS
- [~] 3.10 Substituir cores hardcoded em `src/app/admin/modifiers/page.module.css` por tokens CSS
- [~] 3.11 Substituir cores hardcoded em `src/app/admin/configuracoes/page.module.css` por tokens CSS
- [~] 3.12 Substituir cores hardcoded em `src/app/admin/orders/page.module.css` por tokens CSS
- [ ] 3.13 Substituir cores hardcoded em `src/components/admin/AdminLayout.module.css` por tokens CSS
- [ ] 3.14 Substituir cores hardcoded em `src/components/admin/CategoryList.module.css` por tokens CSS
- [ ] 3.15 Substituir cores hardcoded em `src/components/admin/CategoryForm.module.css` por tokens CSS
- [ ] 3.16 Substituir cores hardcoded em `src/components/admin/ProductList.module.css` por tokens CSS
- [ ] 3.17 Substituir cores hardcoded em `src/components/admin/ProductForm.module.css` por tokens CSS
- [ ] 3.18 Substituir cores hardcoded em `src/components/admin/ComboForm.module.css` por tokens CSS
- [ ] 3.19 Substituir cores hardcoded em `src/components/admin/ModifierGroupForm.module.css` por tokens CSS
- [ ] 3.20 Substituir cores hardcoded em `src/components/admin/OrderList.module.css` por tokens CSS
- [ ] 3.21 Substituir cores hardcoded em `src/components/admin/OrderDetailAdmin.module.css` por tokens CSS
- [ ] 3.22 Substituir cores hardcoded em `src/components/admin/TableManagement.module.css` por tokens CSS
- [ ] 3.23 Substituir cores hardcoded em `src/components/admin/TableQRCode.module.css` por tokens CSS
- [ ] 3.24 Substituir cores hardcoded em `src/components/admin/UserManagement.module.css` por tokens CSS
- [ ] 3.25 Substituir cores hardcoded em `src/components/admin/UserForm.module.css` por tokens CSS
- [ ] 3.26 Executar `grep` em `src/app/admin/**/*.module.css src/components/admin/*.module.css` para verificar zero hardcoded colors
- [ ] 3.27 Verificar visualmente admin dashboard (stats, sidebar, tables)
- [ ] 3.28 Verificar visualmente admin forms (validação de cores semânticas para error/warning/success)

## Phase 4: Remaining Components (Auth, Kitchen, Order, Payment, Analytics, Users)
- [ ] 4.0 **DECISÃO: Manter gradiente purple-blue (#667eea → #764ba2) para páginas de autenticação** — login e register mantêm identidade visual distinta "auth" (convenção da indústria para formulários de login). Não substituir por gradiente orange.
- [ ] 4.1 Substituir cores hardcoded em `src/app/login/page.module.css` por tokens CSS (exceto gradiente purple-blue auth)
- [ ] 4.2 Substituir cores hardcoded em `src/app/register/page.module.css` por tokens CSS (exceto gradiente purple-blue auth)
- [ ] 4.3 Substituir cores hardcoded em `src/app/kitchen/page.module.css` por tokens CSS
- [ ] 4.4 Substituir cores hardcoded em `src/components/auth/LoginForm.module.css` por tokens CSS (exceto gradiente purple-blue auth)
- [ ] 4.5 Substituir cores hardcoded em `src/components/auth/RegisterForm.module.css` por tokens CSS (exceto gradiente purple-blue auth)
- [ ] 4.6 Substituir cores hardcoded em `src/components/kitchen/KitchenDisplay.module.css` por tokens CSS
- [ ] 4.7 Substituir cores hardcoded em `src/components/kitchen/ConnectionStatus.module.css` por tokens CSS
- [ ] 4.8 Substituir cores hardcoded em `src/components/kitchen/WaiterDashboard.module.css` por tokens CSS
- [ ] 4.9 Substituir cores hardcoded em `src/components/kitchen/OrderNotification.module.css` por tokens CSS
- [ ] 4.10 Substituir cores hardcoded em `src/components/order/OrderHistory.module.css` por tokens CSS
- [ ] 4.11 Substituir cores hardcoded em `src/components/payment/PixQRCode.module.css` por tokens CSS
- [ ] 4.12 Substituir cores hardcoded em `src/components/users/UserManagement.module.css` por tokens CSS
- [ ] 4.13 Substituir cores hardcoded em `src/components/users/StaffInviteForm.module.css` por tokens CSS
- [ ] 4.14 Substituir cores hardcoded em `src/components/analytics/AnalyticsDashboard.module.css` por tokens CSS
- [ ] 4.15 Executar `grep` em todos os arquivos `src/components/**/*.module.css` restantes para verificar zero hardcoded colors
- [ ] 4.16 Verificar visualmente kitchen display e waiter dashboard
- [ ] 4.17 Verificar visualmente login e register pages

## Phase 5: Verification & Polish
- [ ] 5.1 Executar `next build` completo e verificar zero erros de compilação
- [ ] 5.2 Executar `grep -r "#[0-9A-Fa-f]{3,6}" src/**/*.module.css` para verificar zero cores hardcoded (excluindo gradientes)
- [ ] 5.3 Verificar que `grep -r "var(--" src/**/*.module.css` confirma uso de CSS variables
- [ ] 5.4 Testar dark mode via DevTools (toggle `data-theme="dark"`) na landing page
- [ ] 5.5 Testar dark mode via DevTools no menu page
- [ ] 5.6 Testar dark mode via DevTools no cart/checkout
- [ ] 5.7 Testar dark mode via DevTools no admin dashboard
- [ ] 5.8 Verificar contraste WCAG AA (4.5:1) para texto normal com `--color-primary` como background
- [ ] 5.9 Verificar contraste WCAG AAA (7:1) para texto grande com `--color-primary` como background
- [ ] 5.10 Verificar focus ring com `--color-focus-ring` em elementos interativos (tab navigation)
- [ ] 5.11 Verificar visual: landing page hero e CTAs com `--gradient-primary`
- [ ] 5.12 Verificar visual: menu category navigation com `--color-primary` para estado ativo
- [ ] 5.13 Verificar visual: product cards com preços em `--color-primary`
- [ ] 5.14 Verificar visual: cart summary com total em `--color-primary` e botão checkout com gradiente
- [ ] 5.15 Verificar visual: admin status badges (pending=`--color-warning`, complete=`--color-success`, error=`--color-error`)
- [ ] 5.16 Verificar visual: admin form validation states (error, warning, success)
- [ ] 5.17 Verificar que todas as 61 files listed in design.md foram modificadas
- [ ] 5.18 Atualizar `openspec/changes/paleta-de-cores-oficial/verify-report.md` com evidências de verificação
