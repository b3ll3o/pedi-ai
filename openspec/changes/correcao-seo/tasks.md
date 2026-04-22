# Tasks: correcao-seo

## Fase 1: Sitemap e Layout

- [x] Criar `public/sitemap.xml` com URLs do site
- [x] Corrigir title em `src/app/layout.tsx` (≤60 chars)
- [x] Adicionar Restaurant JSON-LD schema em `src/app/layout.tsx`

## Fase 2: Metadata nas Páginas

- [x] Adicionar `export const metadata` em `src/app/page.tsx`
- [x] Adicionar `export const metadata` em `src/app/(customer)/menu/page.tsx`
- [x] Adicionar `export const metadata` em `src/app/(customer)/menu/[categoryId]/page.tsx`
- [x] Adicionar `export const metadata` em `src/app/(customer)/cart/page.tsx`
- [x] Adicionar `export const metadata` em `src/app/(customer)/checkout/page.tsx`
- [x] Adicionar `export const metadata` em `src/app/(customer)/product/[productId]/page.tsx`
- [x] Adicionar `export const metadata` em `src/app/(customer)/order/[orderId]/page.tsx`

## Fase 3: Acessibilidade

- [x] Adicionar aria-label nos links da hero section em `src/app/page.tsx`

## Fase 4: Verificação

- [x] Verificar build sem erros
- [x] Verificar todas as páginas têm metadata correta