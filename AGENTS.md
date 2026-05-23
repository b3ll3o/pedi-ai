<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:pedi-ai-rules -->

# Pedi-AI — Application Rules

---

## REGRAS DO MONOREPO (TODAS AS APPS)

### Idioma

- **Idioma padrão**: Todo o código, UI, mensagens, e documentação DEVE estar em **português brasileiro (pt-BR)**
- Todos os textos visíveis ao usuário, labels, placeholders, mensagens de erro, logs, e documentação devem ser em pt-BR
- Nomes de variáveis, funções, e componentes podem ser em inglês (convenção técnica)
- Mensagens de erro e validação sempre em português

### Qualidade & Testes

#### Cobertura de Testes Unitários

- **Cobertura mínima**: A cobertura de testes unitários DEVE ser de pelo menos **80%** para todas as métricas (statements, branches, functions, lines)
- Verificar cobertura com `pnpm test:coverage`
- Métricas de cobertura devem ser monitoradas em CI/CD
- Arquivos com cobertura abaixo do limiar devem ser tratados como dívida técnica

#### Testes de Integração

- **Todos os fluxos principais DEVEM ser cobertos** por testes de integração
- Testes de integração usar Vitest com mocks de APIs
- Configurar pipelines de CI para rodar todos os testes automaticamente

### Arquitetura DDD (TODAS AS APPS)

> Todas as apps do monorepo (`apps/web` e `apps/api`) DEVEM seguir a arquitetura DDD.

#### Bounded Contexts Implementados (apps/web)

| Bounded Context | Status | Entities                             | Value Objects                              | Events   | Repos |
| --------------- | ------ | ------------------------------------ | ------------------------------------------ | -------- | ----- |
| `admin/`        | ✅     | Restaurante, UsuarioRestaurante      | ConfiguracoesRestaurante, PapelRestaurante | 7 events | ✅    |
| `autenticacao/` | ✅     | Usuario, Sessao                      | Papel, Credenciais                         | 3 events | ✅    |
| `cardapio/`     | ✅     | Categoria, Produto, GrupoModificador | Preco, Alergeno, ValorModificador          | -        | ✅    |
| `mesa/`         | ✅     | Mesa                                 | NumeroMesa                                 | -        | ✅    |
| `pagamento/`    | ✅     | Pagamento, Transacao                 | StatusPagamento, MetodoPagamento           | 4 events | ✅    |
| `pedido/`       | ✅     | Pedido, ItemPedido                   | StatusPedido, Dinheiro, MetodoPagamento    | 3 events | ✅    |
| `shared/`       | ✅     | AggregateRootClass                   | Excecoes, Types                            | -        | -     |

#### Estrutura de Diretórios DDD (apps/web)

```
apps/web/src/
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
│   ├── persistence/           # Dexie/IndexedDB, Zustand stores
│   ├── external/              # APIs externas (PostgresAuthAdapter, Pix)
│   └── repositories/          # Repository implementations
└── presentation/              # NEXT.JS - UI, API routes, web-only
    ├── app/                   # App Router
    ├── components/            # Componentes React
    └── hooks/                 # Custom hooks
```

#### Estrutura de Diretórios DDD (apps/api)

```
apps/api/src/
├── domain/                    # REGRAS DE NEGÓCIO - puro, testável, sem deps
│   ├── [bounded-context]/    # ex: pedidos/, pagamentos/, restaurantes/
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
├── infrastructure/            # IMPLEMENTAÇÕES - adapters, repos, Prisma
│   ├── persistence/           # Repositories Prisma
│   ├── external/              # APIs externas (MercadoPago)
│   └── repositories/          # Repository implementations
└── presentation/              # NESTJS - Controllers, Gateways, DTOs
    ├── controllers/           # Controllers REST
    ├── gateways/             # WebSocket gateways
    └── dto/                  # Data Transfer Objects
```

#### Regras de Dependência (DDD)

**apps/web:**

- **apps/web/src/domain/** não pode importar de **application/**, **infrastructure/**, ou **presentation/**
- **apps/web/src/application/** só importa de **domain/** e interfaces (não implementations)
- **apps/web/src/infrastructure/** implementa interfaces definidas em **domain/**
- **apps/web/src/presentation/** depende de **application/** — nunca acessa **domain/** diretamente

**apps/api:**

- **apps/api/src/domain/** não pode importar de **application/**, **infrastructure/**, ou **presentation/**
- **apps/api/src/application/** só importa de **domain/** e interfaces (não implementations)
- **apps/api/src/infrastructure/** implementa interfaces definidas em **domain/**
- **apps/api/src/presentation/** depende de **application/** — nunca acessa **domain/** diretamente

#### Naming DDD

- Entidades: `Pedido`, `ItemCardapio`, `Mesa` (substantivos de negócio)
- Value Objects: `Dinheiro`, `Quantidade`, `Endereco` (características imutáveis)
- Events: `PedidoCriado`, `ItemAdicionadoAoCarrinho` (verbo no passado)
- Use Cases: `CriarPedido`, `AdicionarItemAoCarrinho` (verbo + substantivo)

---

## REGRAS apps/web

### Design Responsivo

- A aplicação **DEVE** funcionar em qualquer tamanho de tela
- Usar CSS responsivo (media queries, flexbox, grid)
- Breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- Testar sempre em mobile primeiro durante desenvolvimento

### Mobile-First

- Desenvolver **sempre** para mobile primeiro
- Começar pelo menor breakpoint e escalar para cima
- Usar `min-width` media queries (mobile base, desktop enhancement)
- Touch-friendly: botões mínimo 44x44px, gaps adequados
- Evitar bundle grande em mobile

### CSS Best Practices (apps/web)

#### Unidades Relativas

- **Usar `rem` para tamanhos de fonte e espaçamento**: `1rem = 16px` base
- **Usar `em` para valores que devem escalar em relação ao elemento pai**
- **Evitar `px` para tamanhos de fonte**: não escala com preferências do usuário
- **Exceção**: valores < 4px, bordas (`1px`), sombras e valores exatamente `0` podem usar `px`

#### Regras Gerais

- **CSS Custom Properties**: Definir cores e espaçamentos reutilizáveis em `:root`
  ```css
  :root {
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --color-primary: #007bff;
  }
  ```
- **Evitar números mágicos**: usar variáveis ou múltiplos de uma base
- **Usar shorthand properties**: `margin: 0 auto` em vez de propriedades separadas
- **Agrupar propriedades relacionadas**: layout → box model → visual → tipografia
- **Evitar `!important`**: preferir specificity adequada
- **Usar `clamp()` para valores fluidos**: `font-size: clamp(1rem, 2.5vw, 1.5rem)`

#### Breakpoints

- Mobile: < 640px (40em)
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Usar `em` em media queries: `@media (min-width: 40em)`

### Offline-First

- A aplicação **DEVE** funcionar sem conexão de internet
- Service Worker (Workbox) para cache de assets
- IndexedDB (Dexie) para persistência local
- Carrinho e dados do cardápio disponíveis offline
- Pedidos feitos offline devem ser enfileirados e syncados automaticamente ao reconectar
- Sempre dar feedback visual de status de conectividade
- Implementar retry com backoff exponencial para operações offline

### HTML Semântico

- **Heading hierarchy**: Apenas UM `h1` por página; `h2`-`h6` em ordem lógica sem saltos
- **Landmarks**: Usar elementos HTML5 — `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<aside>`
- **Sections**: Cada `<section>` DEVE ter `aria-labelledby` apontando para o ID do seu título
- **Nav**: Usar `<nav>` com `aria-label` descritivo
- **Listas**: Usar `<ul>` e `<li>` para listas de itens relacionados
- **Botões vs Links**: `<button>` para ações; `<a>` para navegação
- **Ênfase**: `<strong>` para texto importante; `<em>` para ênfase semântica
- **Ícones decorativos**: `aria-hidden="true"`
- **Accessible Names**: Todos os elementos interativos devem ter nome acessível

### SEO (apps/web)

#### Regras Obrigatórias

- **Toda página DEVE ter metadata completa**: `title`, `description`, `og:*`, `twitter:*`, `robots`, `canonical`
- **Títulos SEO**: Máximo 60 caracteres, incluir palavra-chave principal no início
- **Descriptions**: 120-160 caracteres, incluir CTAs e palavras-chave
- **Imagens**: Sempre usar `next/image` com `alt` descritivo
- **Links**: Usar `aria-label` quando o texto não for autoexplicativo
- **URLs**: Semânticas, minúsculas, com hífens (ex: `/cardapio-digital`)
- **Structured Data**: JSON-LD para Organization, WebSite, FAQPage, Restaurant
- **Performance**: Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1); usar `next/font`

#### Landing Page SEO Checklist

- [ ] Title: "Cardápio Digital para Restaurantes | Pedi-AI - Funciona Offline"
- [ ] Meta description com principais USPs
- [ ] Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [ ] Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] JSON-LD: Organization + WebSite schema
- [ ] FAQPage schema para seção de perguntas frequentes
- [ ] Canonical URL e robots.txt

### Testes E2E (apps/web)

- **Todos os fluxos principais DEVEM ter teste E2E** com Playwright
- Fluxos obrigatórios:
  - Fluxo de pedido completo (montar carrinho → fechar pedido → pagamento)
  - Fluxo de autenticação (login, logout, recuperação de senha)
  - Fluxo offline (executar online, sync ao reconectar)
  - Fluxo de administração (CRUD de cardápio, mesas, pedidos)
- **Testes E2E DEVEM ser atualizados IMEDIATAMENTE** quando:
  - Nova funcionalidade for adicionada
  - Funcionalidade existente for modificada
  - Bug for corrigido
  - UI/UX for implementada
- **Antes de merge de PR**: Todos os testes E2E DEVEM passar localmente
- **CI/CD**: Pipeline E2E deve bloquear merge se testes falharem
- Manter inventário de fluxos cobertos em `apps/web/tests/e2e/README.md`

---

## REGRAS apps/api

### Stack

- **NestJS + Fastify** para performance
- **Prisma ORM** com PostgreSQL
- **Socket.io** para comunicação em tempo real
- **JWT** para autenticação (via `passport-jwt`)

### Regras de API

- Validar inputs com class-validator
- Usar DTOs para transferência de dados
- Implementar tratamento de erros consistente
- Logs em português para operações de negócio
- Seguir arquitetura DDD conforme definido acima

---

## Estrutura do Monorepo

```
pedi-ai/
├── apps/
│   ├── api/                  # NestJS + Prisma + PostgreSQL
│   │   └── src/
│   │       ├── domain/       # DDD: entidades, value objects, events
│   │       ├── application/  # DDD: use cases
│   │       ├── infrastructure/ # DDD: repositories, adapters
│   │       └── presentation/   # NestJS: controllers, gateways, DTOs
│   └── web/                  # Next.js 16 + TypeScript
│       ├── public/           # Arquivos estáticos (sw.js, manifest, robots.txt)
│       ├── tests/            # Vitest + Playwright
│       └── src/
│           ├── domain/       # DDD: entidades, value objects, events
│           ├── application/  # DDD: use cases
│           ├── infrastructure/ # DDD: repositories, adapters
│           └── presentation/   # Next.js: app, components, hooks
├── packages/
│   └── shared/               # Código compartilhado (sem deps de framework)
│       └── src/
│           ├── constants/    # Feature flags, constantes de negócio
│           └── utils/        # Logger, helpers puros
└── docs/                     # Documentação
```

---

## Progresso da Migração DDD

### apps/web

> ✅ **COMPLETO**: `apps/web/src/services/` migrado para `apps/web/src/application/services/`
> ✅ **COMPLETO**: `apps/web/src/stores/` migrado para `apps/web/src/infrastructure/persistence/`

### apps/api

> 🚧 **EM ANDAMENTO**: Estrutura de diretórios DDD criada (`domain/`, `application/`, `infrastructure/`, `presentation/`)
> Módulos atuais (`auth/`, `orders/`, `payments/`, `restaurants/`, `realtime/`) ainda não foram migrados
> Plano de migração disponível em `docs/guides/DDD_MIGRACAO_API.md`
> Status: Estrutura base criada, migracao incremental em progresso

<!-- END:pedi-ai-rules -->

## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:

- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.
