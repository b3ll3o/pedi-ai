# Design: correcao-seo

## Visão Geral

Correção SEO seguindo o proposal.md existente. Implementação faseada para minimizar riscos.

## Arquitetura de Mudanças

### 1. Sitemap XML (`public/sitemap.xml`)

Estrutura básica com URLs estáticas do site:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{BASE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{BASE_URL}/menu</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>{BASE_URL}/cart</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <!-- checkout, order pages com priority baixa -->
</urlset>
```

### 2. Title do Layout

**Antes:** `PediAI - Cardápio Digital para Restaurantes | Funciona Offline` (63 chars)
**Depois:** `PediAI - Cardápio Digital Restaurante | Offline` (44 chars)

Objetivo: manter informação essencial respeitando limite de 60 chars.

### 3. Restaurant JSON-LD

Adicionar ao `@graph` no layout:

```json
{
  "@type": "Restaurant",
  "name": "PediAI",
  "url": "{BASE_URL}",
  "servesCuisine": "Brasileira",
  "priceRange": "$$",
  "acceptsReservations": true
}
```

### 4. Metadata Exports

Cada página receber `export const metadata: Metadata`:

| Página | Title | Description |
|--------|-------|-------------|
| `src/app/page.tsx` | Cardápio Digital Restaurantes \| Pedi-AI | Cardápio digital que funciona offline... |
| `src/app/(customer)/menu/page.tsx` | Cardápio \| Pedi-AI | Browse categorías e produtos do cardápio |
| `src/app/(customer)/menu/[categoryId]/page.tsx` | {category} \| Pedi-AI | Produtos da categoria {category} |
| `src/app/(customer)/cart/page.tsx` | Carrinho \| Pedi-AI | Seu pedido atual no Pedi-AI |
| `src/app/(customer)/checkout/page.tsx` | Checkout \| Pedi-AI | Finalizar pedido no Pedi-AI |
| `src/app/(customer)/product/[productId]/page.tsx` | {product} \| Pedi-AI | Detalhes do produto |
| `src/app/(customer)/order/[orderId]/page.tsx` | Pedido #{orderId} \| Pedi-AI | Confirmação do seu pedido |

### 5. aria-labels na Landing

Links sem texto descritivo na hero section:

```tsx
<a href="/register" aria-label="Criar conta gratuita no Pedi-AI">
<a href="#how-it-works" aria-label="Ver como funciona o Pedi-AI">
```

## Arquivos a Modificar

1. `public/sitemap.xml` - criar
2. `src/app/layout.tsx` - title + Restaurant schema
3. `src/app/page.tsx` - metadata + aria-labels
4. `src/app/(customer)/menu/page.tsx` - metadata
5. `src/app/(customer)/menu/[categoryId]/page.tsx` - metadata
6. `src/app/(customer)/cart/page.tsx` - metadata
7. `src/app/(customer)/checkout/page.tsx` - metadata
8. `src/app/(customer)/product/[productId]/page.tsx` - metadata
9. `src/app/(customer)/order/[orderId]/page.tsx` - metadata

## Riscos e Mitigações

- **Sitemap desatualizado:** Recomendado adicionar `next-sitemap` no build
- **Conflito metadata:** Page-specific sobrescreve layout (comportamento Next.js padrão)