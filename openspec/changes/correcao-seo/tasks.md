# Tasks: correcao-seo

## Fase 1: Sitemap e Layout

- [ ] Criar `public/sitemap.xml` com URLs do site
- [ ] Corrigir title em `src/app/layout.tsx` (≤60 chars)
- [ ] Adicionar Restaurant JSON-LD schema em `src/app/layout.tsx`

## Fase 2: Metadata nas Páginas

- [ ] Adicionar `export const metadata` em `src/app/page.tsx`
- [ ] Adicionar `export const metadata` em `src/app/(customer)/menu/page.tsx`
- [ ] Adicionar `export const metadata` em `src/app/(customer)/menu/[categoryId]/page.tsx`
- [ ] Adicionar `export const metadata` em `src/app/(customer)/cart/page.tsx`
- [ ] Adicionar `export const metadata` em `src/app/(customer)/checkout/page.tsx`
- [ ] Adicionar `export const metadata` em `src/app/(customer)/product/[productId]/page.tsx`
- [ ] Adicionar `export const metadata` em `src/app/(customer)/order/[orderId]/page.tsx`

## Fase 3: Acessibilidade

- [ ] Adicionar aria-label nos links da hero section em `src/app/page.tsx`

## Fase 4: Verificação

- [ ] Verificar build sem erros
- [ ] Verificar todas as páginas têm metadata correta