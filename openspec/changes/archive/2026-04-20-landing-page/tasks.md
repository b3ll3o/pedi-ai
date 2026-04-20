# Tasks: Landing Page

## Change: landing-page
## Project: pedi-ai
## Pipeline: accelerated
## Persistence: openspec

---

## 1. Foundation

- [x] **1.1** Analisar `src/app/layout.tsx` — verificar providers existentes (ReactQueryProvider, StoreProvider, ServiceWorkerRegistration, OfflineIndicator) e compatibilidade com landing page
  Verification:
  - Run: Ler arquivo `src/app/layout.tsx` e confirmar presença dos 4 providers listados
  - Expected: Arquivo contém ReactQueryProvider, StoreProvider, ServiceWorkerRegistration e OfflineIndicator

- [x] **1.2** Analisar `src/app/globals.css` — identificar variáveis CSS existentes (cores, tipografia) e estrutura de reset
  Verification:
  - Run: Ler arquivo `src/app/globals.css` e listar variáveis CSS (custom properties) e regras de reset
  - Expected: Documentação das variáveis de cor, tipografia e reset detectados

- [x] **1.3** Criar `src/app/page.module.css` — definir variáveis CSS para a landing page (cores primárias, espaçamentos, breakpoints mobile-first)
  Verification:
  - Run: Verificar existência do arquivo `src/app/page.module.css` e validar conteúdo
  - Expected: Arquivo existe e contém `(:root)` ou escopo similar com `--color-primary`, `--color-secondary`, `--spacing-*`, e pelo menos um `@media (min-width: *)` para breakpoints

---

## 2. Core Implementation

### 2.1 Hero Section
- [x] **2.1.1** Implementar headline "Cardápio Digital para Restaurantes"
- [x] **2.1.2** Implementar subheadline "Funciona offline, sem filas, com pedidos em tempo real"
- [x] **2.1.3** Implementar CTA "Começar Gratuitamente" com link para cadastro
- [x] **2.1.4** Adicionar container responsivo com padding mobile-first
  Verification:
  - Run: Inspecionar `src/app/page.tsx` e confirmar presença do componente Hero com headline, subheadline, CTA e container responsivo
  - Expected: Hero section renderiza 3 elementos de texto + 1 botão CTA com link funcional

### 2.2 Features Section
- [x] **2.2.1** Criar grid de 6 cards de features em layout mobile-first (1 coluna mobile, 2 colunas tablet, 3 colunas desktop)
- [x] **2.2.2** Implementar card Mobile-First: "Interface otimizada para smartphones"
- [x] **2.2.3** Implementar card Offline Support: "Funciona sem internet"
- [x] **2.2.4** Implementar card QR Codes: "Identificação de mesas por código"
- [x] **2.2.5** Implementar card Pedidos em Tempo Real: "Sem atrasos na cozinha"
- [x] **2.2.6** Implementar card Painel Admin: "Gerenciamento do cardápio"
- [x] **2.2.7** Implementar card Kitchen Display: "Visualização de pedidos na cozinha"
  Verification:
  - Run: Inspecionar `src/app/page.tsx` e confirmar grid com 6 cards de features
  - Expected: Grid responsivo com 6 cards e textos em pt-BR conforme listados

### 2.3 Pricing Section
- [x] **2.3.1** Implementar título "Preços Simples e Transparentes"
- [x] **2.3.2** Implementar tabela de 3 colunas de preço (1-4 restaurantes: R$59, 5-9: R$56, 10+: R$53)
- [x] **2.3.3** Implementar disclaimer "Cancelar a qualquer momento, sem burocracia"
- [x] **2.3.4** Implementar CTA "Começar Gratuitamente" abaixo da tabela de preços
  Verification:
  - Run: Inspecionar `src/app/page.tsx` e confirmar Pricing section com título, tabela de 3 colunas, disclaimer e CTA
  - Expected: Seção Pricing contém título, tabela com 3 planos (R$59, R$56, R$53) e botão CTA

### 2.4 Footer
- [x] **2.4.1** Implementar footer minimalista com copyright "© 2026 Pedi-AI. Todos os direitos reservados."
  Verification:
  - Run: Inspecionar `src/app/page.tsx` e confirmar footer com texto de copyright correto
  - Expected: Footer renderiza texto "© 2026 Pedi-AI. Todos os direitos reservados."

---

## 3. Integration

- [x] **3.1** Substituir conteúdo de `src/app/page.tsx` com nova landing page usando os componentes CSS
- [x] **3.2** Garantir que `layout.tsx` continue funcional com todos os providers
- [x] **3.3** Verificar compatibilidade de tipografia (Geist fonts) com novo layout — FIX NEEDED (fix applied: var(--font-geist-sans))
- [x] **3.4** Atualizar `globals.css` se necessário para estilos globais da landing page — FIX NEEDED (fix applied: font-family updated)
  Verification:
  - Run: Verificar se `globals.css` contém variáveis globais necessárias (cores, tipografia)
  - Expected: Variáveis globais definidas em `:root` se necessário para a landing page

---

## 4. Verification

- [x] **4.1** Testar responsividade em DevTools (320px mobile, 640px tablet, 1024px desktop)
- [x] **4.2** Verificar se todas as 4 seções (Hero, Features, Pricing, Footer) estão visíveis e legíveis
- [x] **4.3** Verificar se CTAs "Começar Gratuitamente" estão presentes e clicáveis (2 locais: Hero e Pricing)
- [x] **4.4** Confirmar que todo conteúdo está em português brasileiro (pt-BR)
- [-] **4.5** Executar `npm run build` — FALHOU: erro TypeScript pré-existente em `src/app/api/menu/route.ts` (não relacionado à landing page)
- [x] **4.6** Executar `npm run dev` e verificar carregamento da página em localhost
  Verification:
  - Run: `npm run dev`, acessar `http://localhost:3000`
  - Expected: Página carrega com status 200; título ou conteúdo da landing page visível no HTML

---

## Execution Order

1. Foundation (1.1 → 1.3) — analisar estrutura existente e criar CSS base
2. Core Implementation (2.1 → 2.4) — implementar Hero, Features, Pricing e Footer
3. Integration (3.1 → 3.4) — substituir page.tsx e verificar providers
4. Verification (4.1 → 4.6) — testar responsividade, conteúdo, build e runtime

---

## Next Step

Executar fase **1. Foundation** — analisar layout.tsx, globals.css e criar page.module.css com variáveis CSS para a landing page.
