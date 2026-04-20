<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:pedi-ai-rules -->
# Pedi-AI — Application Rules

## Idioma / Language

- **Idioma padrão**: Todo o código, UI, mensagens, e documentação DEVE estar em **português brasileiro (pt-BR)**
- Todos os textos visíveis ao usuário, labels, placeholders, mensagens de erro, logs, e documentação devem ser em pt-BR
- Nomes de variáveis, funções, e componentes podem ser em inglês (convenção técnica)
- Mensagens de erro e validação sempre em português

## Design Responsivo

- A aplicação **DEVE** funcionar em qualquer tamanho de tela
- Usar CSS responsivo (media queries, flexbox, grid)
- Breakpoints recomendados:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- Testar sempre em mobile primeiro durante desenvolvimento

## Mobile-First

- Desenvolver **sempre** para mobile primeiro
- Começar pelo menor breakpoint e escalar para cima
- Usar `min-width` media queries (mobile base, desktop enhancement)
- Touch-friendly: botões mínimo 44x44px, gaps adequados
- Performance mobile优先 — evitar bundle grande em mobile

## Offline-First

- A aplicação **DEVE** funcionar sem conexão de internet
- Usar Service Worker (Workbox) para cache
- Usar IndexedDB (Dexie) para persistência local
- Carrinho e dados do cardápio devem estar disponíveis offline
- Pedidos feitos offline devem ser enfileirados e syncados automaticamente ao reconectar
- Sempre dar feedback visual de status de conectividade
- Implementar retry com backoff exponencial para operações offline

## SEO (Search Engine Optimization)

### Regras Obrigatórias

- **Toda página DEVE ter metadata completa**: `title`, `description`, `og:*`, `twitter:*`, `robots`, `canonical`
- **Títulos SEO**: Máximo 60 caracteres, incluir palavra-chave principal no início
- **Descriptions**: Meta description entre 120-160 caracteres, incluir CTAs e palavras-chave
- **Heading hierarchy**: Apenas UM `h1` por página; `h2`-`h6` em ordem lógica sem saltos
- **Imagens**: Sempre usar `next/image` com `alt` descritivo; nunca imagens sem alt
- **Links**: Usar `aria-label` quando o texto do link não for autoexplicativo
- **URLs**: Devem ser semânticas, em minúsculas, com hífens (ex: `/cardapio-digital` não `/cardapio_digital`)
- **Structured Data**: Implementar JSON-LD para Organization, WebSite, FAQPage, Restaurant conforme apropriado
- **Performance**: Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1); usar `next/font` para fontes
- **Sitemap**: Manter `sitemap.xml` e `robots.txt` atualizados; usar `next-sitemap` para geração automática

### Landing Page SEO Checklist

- [ ] Title: "Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline"
- [ ] Meta description com principais USPs (offline, tempo real, QR codes)
- [ ] Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [ ] Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] JSON-LD: Organization + WebSite schema
- [ ] FAQPage schema para seção de perguntas frequentes
- [ ] Canonical URL apontando para domínio principal
- [ ] robots.txt permitindo indexing da landing page

### Technical SEO

- Gerar `sitemap.xml` automaticamente via `next-sitemap` em build
- Configurar `robots.txt` com diretivas adequadas
- Usar `<link rel="canonical">` em todas as páginas
- Implementar redirect 301 para URLs antigas se houver
- Verificar que não há conteúdo duplicado (usar canonical tags)
- Adicionar `@nuxtjs/google-fonts` ou `next/font` para fontes otimizadas

<!-- END:pedi-ai-rules -->
