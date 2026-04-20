# Proposal: Correção SEO - Metadata e Sitemap

## Intent

Corrigir as violações das regras SEO do AGENTS.md para garantir que todas as páginas tenham metadata completa, sitemap.xml exista, e structured data esteja correto.

## Scope

### In Scope
- Criar `sitemap.xml` em `public/sitemap.xml`
- Corrigir title em `src/app/layout.tsx` (63 → max 60 chars)
- Adicionar Restaurant JSON-LD schema em `src/app/layout.tsx`
- Adicionar metadata exports nas 7 páginas que herdam sem meta própria:
  - `src/app/page.tsx` (Landing)
  - `src/app/(customer)/menu/page.tsx`
  - `src/app/(customer)/menu/[categoryId]/page.tsx`
  - `src/app/(customer)/cart/page.tsx`
  - `src/app/(customer)/checkout/page.tsx`
  - `src/app/(customer)/product/[productId]/page.tsx`
  - `src/app/(customer)/order/[orderId]/page.tsx`
- Adicionar aria-label nos links da landing page

### Out of Scope
- Modificar структуру de URLs (já estão corretas com hifens)
- Adicionar novo conteúdo ou funcionalidades
- Modificar componentes React (apenas metadata)

## Approach

1. **Criar sitemap.xml** usando padrão Next.js com next-sitemap ou manualmente com URLs do projeto
2. **Corrigir title** para "Cardápio Digital Restaurantes | Pedi-AI - Offline" (56 chars)
3. **Adicionar Restaurant schema** com tipo FoodEstablishment
4. **Adicionar page-specific metadata** em cada página listada
5. **Adicionar aria-label** nos links da hero section

## Affected Areas

| Arquivo | Mudança |
|---------|---------|
| `public/sitemap.xml` | Criar arquivo com URLs do site |
| `public/robots.txt` | Atualizar referência do sitemap |
| `src/app/layout.tsx` | title + JSON-LD Restaurant |
| `src/app/page.tsx` | + metadata export + aria-labels |
| `src/app/(customer)/menu/page.tsx` | + metadata export |
| `src/app/(customer)/menu/[categoryId]/page.tsx` | + metadata export |
| `src/app/(customer)/cart/page.tsx` | + metadata export |
| `src/app/(customer)/checkout/page.tsx` | + metadata export |
| `src/app/(customer)/product/[productId]/page.tsx` | + metadata export |
| `src/app/(customer)/order/[orderId]/page.tsx` | + metadata export |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| sitemap.xml desatualizado com novas rotas | Alta | Baixo | Adicionar @next/sitemap em build |
| Conflito de metadata com layout | Baixa | Baixo | Page-specific metadata sobrescreve layout |

## Rollback Plan

1. Remover sitemap.xml
2. Reverter title no layout.tsx
3. Remover Restaurant JSON-LD
4. Remover metadata exports das páginas
5. Remover aria-labels

## Success Criteria

- [ ] `public/sitemap.xml` existe e é válido
- [ ] Title em layout.tsx ≤ 60 caracteres
- [ ] Restaurant JSON-LD presente no layout
- [ ] 7 páginas com metadata exports completos (title, description, canonical, og:*)
- [ ] Links da landing com aria-label quando necessário
- [ ] SEO Lighthouse score ≥ 90