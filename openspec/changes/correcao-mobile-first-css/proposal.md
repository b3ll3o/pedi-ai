# Proposal: Correção Mobile-First CSS - Touch e Media Queries

## Intent

Corrigir as violações das regras mobile-first e touch-friendly do AGENTS.md: botões pequenos (<44x44px), uso de max-width (desktop-first), e tamanhos hardcoded.

## Scope

### In Scope
- Aumentar todos os botões para mínimo 44x44px nos arquivos:
  - `OrderNotification.module.css` (.dismissBtn: 28→44)
  - `TableQRCode.module.css` (.closeButton: 32→44)
  - `CartItem.module.css` (.removeButton: 28→44, .quantityButton: 32→44)
  - `ProductDetail.module.css` (.quantityButton: 40→44)
- Converter 9 arquivos de max-width para min-width (mobile-first):
  - KitchenDisplay.module.css
  - OrderDetailAdmin.module.css
  - AdminLayout.module.css
  - LoginForm.module.css
  - CartDrawer.module.css
  - CartItem.module.css
  - CartBadge.module.css
  - ProductCard.module.css
  - CategoryCard.module.css
- Corrigir blobs hardcoded na landing page:
  - heroBlob1: 500px → max-width: 50vw
  - heroBlob2: 400px → max-width: 40vw
  - finalCtaBlob1: 400px → max-width: 40vw
  - finalCtaBlob2: 300px → max-width: 30vw

### Out of Scope
- Modificar lógica de componentes React
- Alterar breakpoints além dos necessários
- Adicionar novos componentes

## Approach

1. **Botões**: Editar CSS modules aumentando min-height/min-width para 44px
2. **Media queries**: Trocar `@media (max-width: X)` por `@media (min-width: X)` e ajustar estilos base
3. **Blobs**: Substituir width fixo por max-width com % ou vw

## Affected Areas

| Arquivo | Mudança |
|---------|---------|
| `src/components/kitchen/OrderNotification.module.css` | +16px no dismissBtn |
| `src/components/admin/TableQRCode.module.css` | +12px no closeButton |
| `src/components/cart/CartItem.module.css` | +12-16px nos botões + corrigir media query |
| `src/components/menu/ProductDetail.module.css` | +4px no quantityButton |
| `src/components/kitchen/KitchenDisplay.module.css` | max→min-width |
| `src/components/admin/OrderDetailAdmin.module.css` | max→min-width |
| `src/components/admin/AdminLayout.module.css` | max→min-width |
| `src/components/auth/LoginForm.module.css` | max→min-width |
| `src/components/cart/CartDrawer.module.css` | max→min-width |
| `src/components/cart/CartBadge.module.css` | max→min-width |
| `src/components/menu/ProductCard.module.css` | max→min-width + corrigir wrapper |
| `src/components/menu/CategoryCard.module.css` | max→min-width + corrigir wrapper |
| `src/app/page.module.css` | Corrigir blobs |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Layout quebrar em desktop após mudança | Média | Médio | Testar em todos breakpoints |
| Botões ficarem desproporcionais | Baixa | Baixo | Ajustar padding, não só tamanho |

## Rollback Plan

1. Reverter CSS modules individually
2. Git diff para identificar mudanças
3. Testes E2E verificam responsividade

## Success Criteria

- [ ] Todos botões com min 44x44px
- [ ] Nenhum @media (max-width) em CSS modules do projeto
- [ ] Landing page blobs responsivos (não hardcoded 500px)
- [ ] Layout funciona em mobile (<640px), tablet (640-1024px), desktop (>1024px)