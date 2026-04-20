# Proposal: Landing Page

## Intent

Criar uma landing page pública em `/` que serve como ponto de entrada para novos clientes do Pedi-AI. A página deve comunicar claramente o valor do produto, destacar os principais recursos e apresentar uma estrutura de preços transparente para impulsionar conversões.

**Business Value:**
- Reduz atrito na aquisição de novos clientes com informação clara e CTAs diretos
- Estabelece credibilidade através de uma presença web profissional e responsiva
- Elimina a necessidade de reunião de vendas inicial para clientes autocontradados
- Atende ao requisito de projeto mobile-first com experiência otimizada para dispositivos móveis

**Problem Statement:**
 Atualmente, a página inicial (`/`) utiliza o template padrão do Next.js, não коммуніка o valor do Pedi-AI e não oferece caminhos claros para conversão (cadastro ou contato).

---

## Scope

### In Scope

- **Hero Section**: Descrição do Pedi-AI como cardápio digital restoraniano com foco em PWA offline-first
- **Features Section**: Destaque dos principais recursos (mobile-first, suporte offline, QR codes, pedidos em tempo real, painel admin, display de cozinha) com CTAs de venda
- **Pricing Section**: Tabela de preços por volume:
  - 1-4 restaurantes: R$59/mês por restaurante
  - 5-9 restaurantes: R$56/mês por restaurante (desconto de 5%)
  - 10+ restaurantes: R$53/mês por restaurante (desconto de 10%)
  - Modelo: mensal, cancelar a qualquer momento
- **CTA Principal**: Botão "Começar Gratuitamente"
- **Design Responsivo**: Funciona em qualquer tamanho de tela, mobile-first
- **Idioma**: Todo conteúdo em português brasileiro (pt-BR)

### Out of Scope

- Implementação de backend de cadastro/login
- Sistema de pagamento ou processamento de pedidos
- Painel administrativo
- Página de blog, FAQ, ou중앙 de ajuda
- Integração com analytics (Google Analytics, etc.)
- SEO otimizado ou sitemap
- A/B testing ou personalização de conteúdo

---

## Approach

**Tech Stack:**
- Next.js 16.2.4 com App Router e TypeScript
- React 19.2.4
- CSS Modules ou CSS-in-JS (inline styles para simplicidade)
- Sem dependências externas adicionais

**Arquitetura:**
```
src/app/
  page.tsx                    # Landing page (substitui template default)
  layout.tsx                  # Layout raiz (mantém Header/Footer se existirem)
```

**Estrutura da Página:**

1. **Hero Section**
   - Headline: "Cardápio Digital para Restaurantes"
   - Subheadline: "Funciona offline, sem filas, com pedidos em tempo real"
   - CTA: "Começar Gratuitamente"
   - Visual: ilustração ou screenshot do app

2. **Features Section**
   - Grid de cards com os 6 principais recursos:
     - Mobile-First: interface otimizada para smartphones
     - Offline Support: funciona sem internet
     - QR Codes: identificação de mesas por código
     - Pedidos em Tempo Real: sem retards na cozinha
     - Painel Admin: gerenciamento do cardápio
     - Kitchen Display: visualização de pedidos na cozinha

3. **Pricing Section**
   - Título: "Preços Simples e Transparentes"
   - Tabela com 3 colunas de preço
   - Disclaimer: "取消ar a qualquer momento, sem burocracia"
   - CTA: "Começar Gratuitamente"

4. **Footer mínimo**
   - Copyright: "© 2026 Pedi-AI. Todos os direitos reservados."

**Responsividade:**
- Mobile: layout em coluna única, seções empilhadas
- Tablet (640px+): grid de 2 colunas para features
- Desktop (1024px+): grid de 3 colunas para features, layout mais arejado

---

## Affected Areas

| Área | Impacto |
|---|---|
| `src/app/page.tsx` | Substituído completamente com nova landing page |
| `src/app/layout.tsx` | Pode precisar de ajuste para estilos globais |
| `src/app/globals.css` | Estilos CSS para landing page |

---

## Risks

1. **Conflito com layout existente** — Se o `layout.tsx` atual tiver Header/Footer com estilização fixa, a landing page pode não se integrar bem. Mitigação: revisar `layout.tsx` antes da implementação e ajustar se necessário.
2. **Performance mobile** — Seção de features com muitas imagens pode impactar carregamento em mobile. Mitigação: usar imagens otimizadas (WebP) e lazy loading.
3. **Manutenção de conteúdo** — Texto hardcoded na página pode ficar desatualizado. Mitigação: documentar que preços e textos devem ser atualizados no próprio arquivo.

---

## Rollback Plan

**Rollback Mechanism:**

1. **Git Revert** — Reverter o commit que introduz a landing page: `git revert <commit-sha>`
2. **Branch Recovery** — Se o revert não for suficiente, restaurar o arquivo `src/app/page.tsx` original do template Next.js.

**Rollback Decision Matrix:**

| Severity | Trigger | Action |
|---|---|---|
| High | Landing page quebras build | Reverter para template default |
| Medium | Layout inconsistente em mobile | Voltar ao template default e revisitar |
| Low | Conteúdo impreciso | Atualizar texto sem revert |

---

## Success Criteria

| ID | Criterion | Measurement |
|---|---|---|
| SC-01 | Página carrega em < 2s em conexão 4G simulada | Lighthouse audit |
| SC-02 | Layout responsivo funciona em mobile (320px+), tablet (640px+), desktop (1024px+) | Teste manual em DevTools |
| SC-03 | Todas as 3 seções (Hero, Features, Pricing) são visíveis e legíveis | Inspección visual |
| SC-04 | CTA "Começar Gratuitamente" está presente e clicável | Teste de clique |
| SC-05 | Preços exibidos correspondem à tabela especificada | Verificação de conteúdo |
| SC-06 | Todo conteúdo em português brasileiro | Revisão de texto |
| SC-07 | Build passa sem erros (`npm run build`) | CI/CD ou teste local |