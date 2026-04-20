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

<!-- END:pedi-ai-rules -->
