# Tasks: Correção Mobile-First CSS

## Fase 1: Botões 44x44px

- [ ] 1.1 `OrderNotification.module.css` — `.dismissBtn` (min-height: 28px→44px, min-width: 28px→44px)
- [ ] 1.2 `TableQRCode.module.css` — `.closeButton` (min-width: 32px→44px, min-height: 32px→44px)
- [ ] 1.3 `CartItem.module.css` — `.removeButton` (min-height: 28px→44px, min-width: 28px→44px)
- [ ] 1.4 `CartItem.module.css` — `.quantityButton` (min-width: 32px→44px, min-height: 32px→44px)
- [ ] 1.5 `ProductDetail.module.css` — `.quantityButton` (min-width: 40px→44px, min-height: 40px→44px)

## Fase 2: Media Queries (max→min-width)

- [ ] 2.1 `KitchenDisplay.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)`
- [ ] 2.2 `OrderDetailAdmin.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)`
- [ ] 2.3 `AdminLayout.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)`
- [ ] 2.4 `LoginForm.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)`
- [ ] 2.5 `CartDrawer.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)`
- [ ] 2.6 `CartItem.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)`
- [ ] 2.7 `CartBadge.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)`
- [ ] 2.8 `ProductCard.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)` + correção wrapper
- [ ] 2.9 `CategoryCard.module.css` — converter `@media (max-width: X)` → `@media (min-width: X)` + correção wrapper

## Fase 3: Blobs Responsivos

- [ ] 3.1 `src/app/page.module.css` — `heroBlob1` (width: 500px → max-width: 50vw)
- [ ] 3.2 `src/app/page.module.css` — `heroBlob2` (width: 400px → max-width: 40vw)
- [ ] 3.3 `src/app/page.module.css` — `finalCtaBlob1` (width: 400px → max-width: 40vw)
- [ ] 3.4 `src/app/page.module.css` — `finalCtaBlob2` (width: 300px → max-width: 30vw)

## Fase 4: Verificação

- [ ] 4.1 Verificar botões: medir `min-height` e `min-width` de todos seletores afetados — valor mínimo 44px
- [ ] 4.2 Verificar media queries: buscar `@media (max-width:` nos CSS modules — resultado deve ser zero
- [ ] 4.3 Verificar blobs: confirmar que `heroBlob1`, `heroBlob2`, `finalCtaBlob1`, `finalCtaBlob2` não contêm valores fixos em px

## Status

### Fase 1: Botões 44x44px
- [x] 1.1 OrderNotification dismissBtn (já estava 44px)
- [x] 1.2 TableQRCode closeButton (já estava 44px)
- [x] 1.3 CartItem removeButton (28→44px)
- [x] 1.4 CartItem quantityButton (32→44px)
- [x] 1.5 ProductDetail quantityButton (40→44px)

### Fase 2: Media Queries
- [x] 2.1 KitchenDisplay (já estava min-width)
- [x] 2.2 OrderDetailAdmin (já estava min-width)
- [x] 2.3 AdminLayout (já estava min-width)
- [x] 2.4 LoginForm (já estava min-width)
- [x] 2.5 CartDrawer (já estava min-width)
- [x] 2.6 CartItem (já estava min-width)
- [x] 2.7 CartBadge (já estava min-width)
- [x] 2.8 ProductCard (já estava min-width)
- [x] 2.9 CategoryCard (já estava min-width)

### Fase 3: Blobs Responsivos
- [x] 3.1 heroBlob1 (500px → max-width: 50vw)
- [x] 3.2 heroBlob2 (400px → max-width: 40vw)
- [x] 3.3 finalCtaBlob1 (400px → max-width: 40vw)
- [x] 3.4 finalCtaBlob2 (300px → max-width: 30vw)

### Fase 4: Verificação
- [x] 4.1 Botões 44x44px verificados (todos com min-width/min-height 44px)
- [x] 4.2 Media queries convertidas (0 ocorrências de max-width)
- [x] 4.3 Blobs responsivos verificados (todos com vw)
