# Design: Correção Mobile-First CSS

## Visão Geral

Correção de violações mobile-first e touch-friendly no CSS do projeto. As mudanças abrangem três áreas: dimensionamento de botões, conversão de media queries, e responsividade de elementos decorativos.

## Decisões de Arquitetura

### 1. Botões Touch-Friendly (44x44px mínimo)

**Problema**: Botões menores que 44x44px violam a regra touch-friendly do AGENTS.md, causando dificuldade de interação em dispositivos móveis.

**Solução**: Aumentar `min-height` e `min-width` para 44px nos botões afetados.

#### Mudanças por Arquivo

| Arquivo | Seletor | Mudança |
|---------|---------|---------|
| `OrderNotification.module.css` | `.dismissBtn` | `min-height: 28px → 44px`, `min-width: 28px → 44px` |
| `TableQRCode.module.css` | `.closeButton` | `min-width: 32px → 44px`, `min-height: 32px → 44px` |
| `CartItem.module.css` | `.removeButton` | `min-height: 28px → 44px`, `min-width: 28px → 44px` |
| `CartItem.module.css` | `.quantityButton` | `min-width: 32px → 44px`, `min-height: 32px → 44px` |
| `ProductDetail.module.css` | `.quantityButton` | `min-width: 40px → 44px`, `min-height: 40px → 44px` |

**Justificativa**: 44x44px é o tamanho mínimo recomendado para touch targets segundo Apple HIG e Material Design. Ajuste proporcional de padding quando necessário para manter estética.

### 2. Conversão max-width → min-width (Mobile-First)

**Problema**: Uso de `@media (max-width: X)` implementa abordagem desktop-first, invertendo a filosofia mobile-first do projeto.

**Solução**: Converter para `@media (min-width: X)` e mover estilos base para mobile (menor breakpoint), com enhancement progressivo para desktop.

#### Arquivos Afetados

| Arquivo | Breakpoint Original | Novo Breakpoint |
|---------|---------------------|-----------------|
| `KitchenDisplay.module.css` | `@media (max-width: X)` | `@media (min-width: X)` |
| `OrderDetailAdmin.module.css` | `@media (max-width: X)` | `@media (min-width: X)` |
| `AdminLayout.module.css` | `@media (max-width: X)` | `@media (min-width: X)` |
| `LoginForm.module.css` | `@media (max-width: X)` | `@media (min-width: X)` |
| `CartDrawer.module.css` | `@media (max-width: X)` | `@media (min-width: X)` |
| `CartBadge.module.css` | `@media (max-width: X)` | `@media (min-width: X)` |
| `ProductCard.module.css` | `@media (max-width: X)` | `@media (min-width: X)` + correção wrapper |
| `CategoryCard.module.css` | `@media (max-width: X)` | `@media (min-width: X)` + correção wrapper |

#### Padrão de Conversão

```css
/* ANTES (desktop-first) */
.selector { base: desktop-value; }
@media (max-width: 768px) { .selector { mobile-value; } }

/* DEPOIS (mobile-first) */
.selector { base: mobile-value; }
@media (min-width: 768px) { .selector { desktop-value; } }
```

**Justificativa**: Mobile-first prioriza estilos base para mobile e adiciona media queries apenas para telas maiores, reduzindo código e melhora performance em mobile.

### 3. Blobs Responsivos (Landing Page)

**Problema**: Tamanhos fixos em pixels (500px, 400px) não adaptam-se ao tamanho da viewport.

**Solução**: Substituir `width` fixo por `max-width` com unidades relativas (vw).

#### Mudanças

| Seletor | Antes | Depois |
|---------|-------|--------|
| `heroBlob1` | `width: 500px` | `max-width: 50vw` |
| `heroBlob2` | `width: 400px` | `max-width: 40vw` |
| `finalCtaBlob1` | `width: 400px` | `max-width: 40vw` |
| `finalCtaBlob2` | `width: 300px` | `max-width: 30vw` |

**Justificativa**: Usar `max-width: Xvw` permite que o blob ocupe até X% da viewport, mas reduza se necessário, mantendo proporções em qualquer tamanho de tela.

## Resumo dos Arquivos Afetados

```
src/components/kitchen/OrderNotification.module.css    — botões
src/components/admin/TableQRCode.module.css            — botões
src/components/cart/CartItem.module.css               — botões + media query
src/components/menu/ProductDetail.module.css          — botões
src/components/kitchen/KitchenDisplay.module.css      — media query
src/components/admin/OrderDetailAdmin.module.css      — media query
src/components/admin/AdminLayout.module.css           — media query
src/components/auth/LoginForm.module.css              — media query
src/components/cart/CartDrawer.module.css             — media query
src/components/cart/CartBadge.module.css               — media query
src/components/menu/ProductCard.module.css            — media query + wrapper
src/components/menu/CategoryCard.module.css           — media query + wrapper
src/app/page.module.css                               — blobs
```

## Critérios de Verificação

1. **Botões**: Medir `min-height` e `min-width` de todos os seletores afetados — valor mínimo deve ser 44px
2. **Media queries**: Buscar `@media (max-width:` nos CSS modules — resultado deve ser zero
3. **Blobs**: Verificar que `heroBlob1`, `heroBlob2`, `finalCtaBlob1`, `finalCtaBlob2` não contêm valores fixos em px

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Layout quebrar em desktop | Média | Médio | Testar em todos breakpoints (mobile <640px, tablet 640-1024px, desktop >1024px) |
| Botões ficarem desproporcionais | Baixa | Baixo | Ajustar padding proporcional, não só tamanho |
| Blobs ficarem pequenos em telas grandes | Baixa | Baixo | Usar max-width com vw permite crescimento até limite |

## Plano de Rollback

1. Reverter CSS modules individualmente via `git checkout`
2. Usar `git diff` para identificar mudanças específicas
3. Executar testes E2E para verificar responsividade após reversão
