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

## CSS Best Practices

### Unidades Relativas (Preferir sempre que possível)
- **Usar `rem` para tamanhos de fonte e espaçamento**: `1rem = 16px` base, permite scaling correto quando usuário muda tamanho de fonte do navegador
- **Usar `em` para valores que devem escalar em relação ao elemento pai**: margens, paddings relativos
- **Evitar `px` para tamanhos de fonte**: `px` não escala com preferências do usuário
- **Exceção**: valores muito pequenos (< 4px), bordas (`1px`), sombras e valores que precisam ser exatamente `0` podem usar `px`

### Regras Gerais de CSS
- **Usar CSS Custom Properties (variáveis)**: Definir cores, espaçamentos e valores reutilizáveis em `:root`
  ```css
  :root {
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --color-primary: #007bff;
  }
  ```
- **Evitar números mágicos**: Usar variáveis ou múltiplos de uma base (ex: `0.25rem`, `0.5rem`, `1rem`)
- **Usar shorthand properties**: `margin: 0 auto` em vez de `margin-top: 0; margin-right: auto; ...`
- **Agrupar propriedades relacionadas**: layout (display, position), box model (margin, padding), visual (color, background)
- **Ordem de propriedades**: seguir convenção (visual → layout → tipografia → outros)
- **Evitar `!important`**: Preferir specificity adequada; usar apenas como último recurso
- **Usar `clamp()` para valores fluidos**: `font-size: clamp(1rem, 2.5vw, 1.5rem)` para responsividade automática
- **Minificar e usar sourcemaps em produção**

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Usar `em` em media queries: `@media (min-width: 40em)` (equivalente a 640px)

## Offline-First

- A aplicação **DEVE** funcionar sem conexão de internet
- Usar Service Worker (Workbox) para cache
- Usar IndexedDB (Dexie) para persistência local
- Carrinho e dados do cardápio devem estar disponíveis offline
- Pedidos feitos offline devem ser enfileirados e syncados automaticamente ao reconectar
- Sempre dar feedback visual de status de conectividade
- Implementar retry com backoff exponencial para operações offline

## HTML Semântico

### Regras Obrigatórias

- **Heading hierarchy**: Apenas UM `h1` por página; `h2`-`h6` em ordem lógica sem saltos (nunca pular de h2 para h4)
- **Landmarks**: Usar elementos HTML5 corretos — `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<aside>`
- **Sections**: Cada `<section>` DEVE ter `aria-labelledby` apontando para o ID do seu título
- **Nav**: Usar `<nav>` com `aria-label` descritivo (ex: `aria-label="Navegação principal"`)
- **Listas**: Usar `<ul>` e `<li>` para listas de itens relacionados; não usar `<div>` ou `<br>` para separar itens
- **Botões vs Links**: Usar `<button>` para ações (filtrar, toggle, submit); usar `<a>` para navegação
- **Ênfase**: Usar `<strong>` para texto importante; `<em>` para ênfase/italico semântico
- **Decorative Icons**: Ícones decorativos devem ter `aria-hidden="true"`
- **Accessible Names**: Todos os elementos interativos devem ter nome acessível (texto visível ou `aria-label`)
- **Paragraphs**: Usar `<p>` para parágrafos; não usar `<br>` para criar espaçamento entre blocos de texto

### Estrutura Recomendada por Tipo de Página

**Landing Page / Página de Marketing:**
```
<header><nav aria-label="Navegação principal">...</nav></header>
<main>
  <section aria-labelledby="hero-title"><h1>Título Principal</h1></section>
  <section aria-labelledby="features-title"><h2>Features</h2></section>
  ...
</main>
<footer>...</footer>
```

**Páginas de Lista/Grid:**
```
<main>
  <header><h1>Título da Página</h1></header>
  <section>
    <ul>
      <li><article>Item 1</article></li>
      <li><article>Item 2</article></li>
    </ul>
  </section>
</main>
```

**FAQ:**
```
<section aria-labelledby="faq-title">
  <h2 id="faq-title">Perguntas Frequentes</h2>
  <dl>
    <dt><strong>Pergunta?</strong></dt>
    <dd>Resposta.</dd>
  </dl>
</section>
```

## SEO (Search Engine Optimization)

### Regras Obrigatórias

- **Toda página DEVE ter metadata completa**: `title`, `description`, `og:*`, `twitter:*`, `robots`, `canonical`
- **Títulos SEO**: Máximo 60 caracteres, incluir palavra-chave principal no início
- **Descriptions**: Meta description entre 120-160 caracteres, incluir CTAs e palavras-chave
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

## Qualidade & Testes

### Cobertura de Testes Unitários

- **Cobertura mínima**: A cobertura de testes unitários DEVE ser de pelo menos **80%** para todas as métricas (statements, branches, functions, lines)
- Verificar cobertura com `npm run test:coverage` ou comando equivalente
- Métricas de cobertura devem ser monitoradas em CI/CD
- Arquivos com cobertura abaixo do limiar devem ser tratados como dívida técnica

### Testes de Integração e E2E

- **Todos os fluxos principais DEVEM ser cobertos** por testes de integração e E2E
- Fluxos obrigatórios incluem:
  - Fluxo de pedido completo (montar carrinho → fechar pedido → pagamento)
  - Fluxo de autenticação (login, logout, recuperação de senha)
  - Fluxo offline (precisar executar online, sync ao reconectar)
  - Fluxo de administração (CRUD de cardápio, mesas, pedidos)
- Testes E2E usar Playwright (preferencial) ou Cypress
- Testes de integração usar Vitest com mocks de APIs
- Configurar pipelines de CI para rodar todos os testes automaticamente

### Manutenção de Testes E2E

- **Testes E2E DEVEM ser atualizados IMEDIATAMENTE** sempre que:
  - Uma nova funcionalidade for adicionada
  - Uma funcionalidade existente for modificada
  - Um bug for corrigido
  - Uma mudança de UI/UX for implementada
- **Todos os fluxos da aplicação DEVEM ter teste E2E**, incluindo:
  - Fluxos de usuário (cliente, admin, garçom)
  - Fluxos de negócio (pedidos, pagamentos, autenticação)
  - Fluxos de admin (CRUD de cardápio, mesas, pedidos, usuários)
  - Fluxos de edge cases e tratamento de erros
- **Antes de.merge de PR**: Todos os testes E2E DEVEM passar localmente
- **CI/CD**: Pipeline E2E deve bloquear merge se testes falharem
- **Cobertura de fluxos**: Manter inventário atualizado de fluxos cobertos em `tests/e2e/README.md`

## Arquitetura DDD (Domain-Driven Design)

> ✅ **STATUS**: A arquitetura DDD está **MAJORITARIAMENTE IMPLEMENTADA**. A estrutura DDD existe em `src/domain/`, `src/application/`, e `src/infrastructure/`.
> A estrutura coexiste com código em `src/components/`, `src/hooks/`, e `src/lib/` (legacy).
> Ver: `openspec/changes/archive/2026-04-25-implantacao-ddd/` para histórico da migração.

### Bounded Contexts Implementados

| Bounded Context | Status | Entities | Value Objects | Events | Repos |
|-----------------|--------|----------|---------------|--------|-------|
| `admin/` | ✅ | Restaurante, UsuarioRestaurante | ConfiguracoesRestaurante, PapelRestaurante | 7 events | ✅ |
| `autenticacao/` | ✅ | Usuario, Sessao | Papel, Credenciais | 3 events | ✅ |
| `cardapio/` | ✅ | Categoria, Produto, GrupoModificador | Preco, Alergeno, ValorModificador | - | ✅ |
| `mesa/` | ✅ | Mesa | NumeroMesa | - | ✅ |
| `pagamento/` | ✅ | Pagamento, Transacao | StatusPagamento, MetodoPagamento | 4 events | ✅ |
| `pedido/` | ✅ | Pedido, ItemPedido | StatusPedido, Dinheiro, MetodoPagamento | 3 events | ✅ |
| `shared/` | ✅ | AggregateRootClass | Excecoes, Types | - | - |

### Regras Obrigatórias

- **NOVO código** deve seguir arquitetura DDD
- O domínio (**domain/**) **DEVE** ser independente de frameworks — sem imports de Next.js, React, ou bibliotecas de infra
- Entidades, value objects, aggregates e events são pura lógica de negócio em TypeScript
- Casos de uso no **application/** orchestrating domínio e infra
- **presentation/** (Next.js) **SÓ** faz renderização e coleta input do usuário
- **Migração gradual**: código legacy em `src/lib/` será migrado conforme necessidade

### Estrutura de Diretórios

```
src/
├── domain/                    # REGRAS DE NEGÓCIO - puro, testável, sem deps
│   ├── [bounded-context]/    # ex: pedido/, cardapio/, mesa/
│   │   ├── entities/         # Entidades com identity
│   │   ├── value-objects/    # Value objects imutáveis
│   │   ├── aggregates/        # Aggregate roots
│   │   ├── events/            # Domain events
│   │   ├── services/          # Regras que não pertencem a uma entidade
│   │   └── repositories/       # Interfaces (contratos, não implementations)
│   └── shared/                # Tipos, utils, events compartilhados
├── application/               # CASOS DE USO - orquestração
│   └── [bounded-context]/
│       └── services/          # Application services (use cases)
├── infrastructure/            # IMPLEMENTAÇÕES - adapters, repos, APIs
│   ├── persistence/           # Dexie/IndexedDB implementations
│   ├── external/              # APIs externas
│   └── repositories/          # Repository implementations
└── presentation/              # NEXT.JS - UI, API routes, web-only
    ├── pages/
    ├── components/
    └── hooks/
```

> **Nota**: A estrutura DDD **JÁ ESTÁ IMPLEMENTADA** em `src/domain/`, `src/application/`, `src/infrastructure/`. O `presentation/` coexiste com a estrutura tradicional. Voir `openspec/changes/archive/2026-04-25-implantacao-ddd/` para o plano de migração completo (em progresso).

### O que vai em cada camada

| Camada | Responsabilidade | Dependências |
|--------|------------------|--------------|
| **domain/** | Entidades, regras, validações, eventos | Nenhuma (puro) |
| **application/** | Casos de uso, coordena domain + infra | domain, interfaces da infra |
| **infrastructure/** | Implementações concretas | domain, libraries externas |
| **presentation/** | UI, input do usuário, API routes | application, components |

### Regras de Dependência

- **domain/** não pode importar de **application/**, **infrastructure/**, ou **presentation/**
- **application/** só importa de **domain/** e interfaces (não implementations)
- **infrastructure/** implementa interfaces definidas em **domain/**
- **presentation/** depende de **application/** — nunca acessa **domain/** diretamente

### Naming

- Entidades: `Pedido`, `ItemCardapio`, `Mesa` (substantivos de negócio)
- Value Objects: `Dinheiro`, `Quantidade`, `Endereco` (características imutáveis)
- Events: `PedidoCriado`, `ItemAdicionadoAoCarrinho` (verbo no passado)
- Use Cases: `CriarPedido`, `AdicionarItemAoCarrinho` (verbo + substantivo)

---

## Arquitetura Atual do Projeto

O projeto atualmente segue uma arquitetura **híbrida**:

### Estrutura DDD (Recomendada para novo código)

```
src/
├── domain/                 # REGRAS DE NEGÓCIO - puro, testável, sem deps
├── application/            # CASOS DE USO - orquestração
├── infrastructure/         # IMPLEMENTAÇÕES - adapters, repos
└── presentation/           # NEXT.JS - UI, API routes, web-only
```

### Estrutura Legacy (Em migração gradual)

```
src/
├── app/                    # Next.js App Router - páginas e API routes
├── components/             # Componentes React organizados por domínio
├── hooks/                  # Custom React hooks
└── lib/                    # Módulos reutilizáveis (auth, offline, QR, supabase, logger)
```

| Camada Legacy | Responsabilidade | Status DDD |
|---------------|-----------------|-------------|
| `app/` | Rotas, layouts, API routes | - |
| `components/` | Componentes UI | - |
| `hooks/` | Lógica de interface (React hooks) | - |
| `lib/` | Utilitários e integrações (auth, supabase, offline) | ⚠️ Legacy |

### Progresso da Migração DDD

> ✅ **COMPLETO**: `src/services/` migrado para `src/application/services/`
> ✅ **COMPLETO**: `src/stores/` migrado para `src/infrastructure/persistence/`

<!-- END:pedi-ai-rules -->

## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.
