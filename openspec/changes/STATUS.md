# Status Geral — Openspec Changes

**Última atualização:** 2026-05-12
**Total de changes:** 30 (3 ativos + 27 arquivados)

---

## Changes Ativos

| Change | Status | SDDs | Progresso | Blockers |
|--------|--------|------|-----------|----------|
| `mvp-multica` | 🚀 Em andamento | 5 (checkout OK, kds, cardapio, acompanhamento, qr-code) | ~40% | Sim (PED-18,19,21,22) |
| `2026-05-06-navegacao-publica-restaurantes` | 🔄 Em andamento | 1 | ~70% | Não |
| `2026-05-07-validacao-testes` | 📋 Em planejamento | 1 | ~10% | Não |

---

## Changes Arquivados

| Change | Arquivado em | Descrição |
|--------|--------------|-----------|
| `2026-04-20-cardapio-digital` | 2026-04-20 | Cardápio digital inicial |
| `2026-04-20-correcao-e2e-readme` | 2026-04-20 | Correção README E2E |
| `2026-04-20-landing-page` | 2026-04-20 | Landing page |
| `2026-04-22-archive-report` | 2026-04-22 | Relatório de archive |
| `2026-04-22-correcao-mobile-first-css` | 2026-04-22 | CSS mobile-first |
| `2026-04-22-correcao-offline-first` | 2026-04-22 | Correção offline-first |
| `2026-04-22-correcao-seo` | 2026-04-22 | Correções SEO |
| `2026-04-22-implementacao-e2e` | 2026-04-22 | Implementação E2E |
| `2026-04-22-otimizacao-e2e` | 2026-04-22 | Otimização E2E |
| `2026-04-22-test-recuperacao-senha` | 2026-04-22 | Tests recuperação senha |
| `2026-04-24-admin-full-implementation` | 2026-04-24 | Admin completo |
| `2026-04-24-correcao-e2e` | 2026-04-24 | Correção E2E |
| `2026-04-24-e2e-mock-pagamentos` | 2026-04-24 | E2E mock pagamentos |
| `2026-04-24-melhoria-e2e` | 2026-04-24 | Melhoria E2E |
| `2026-04-25-email-confirmation-template` | 2026-04-25 | Template email |
| `2026-04-25-implantacao-ddd` | 2026-04-25 | Arquitetura DDD |
| `2026-04-25-paleta-de-cores-oficial` | 2026-04-25 | Cores oficiais |
| `2026-04-27-botao-sair-logout` | 2026-04-27 | Logout |
| `2026-04-27-multi-restaurante` | 2026-04-27 | Multi-restaurante |
| `2026-04-28-implementacao-testes-faltantes` | 2026-04-28 | Testes faltantes |
| `2026-04-28-login-redirecionamento-por-papel` | 2026-04-28 | Login por papel |
| `2026-04-28-melhorias-tecnicas` | 2026-04-28 | Melhorias técnicas |
| `2026-04-28-pagina-404-personalizada` | 2026-04-28 | 404 customizado |
| `2026-04-28-registro-selecao-intencao` | 2026-04-28 | Registro/intenção |
| `2026-04-28-simplificacao-pagamento-unico` | 2026-04-28 | Pagamento único |
| `2026-05-06-fluxo-redefinicao-senha` | 2026-05-06 | Redefinição senha |
| `2026-05-06-melhorias-arquitetura-ddd-2026` | 2026-05-06 | DDD 2026 |

---

## Métricas Atuais

| Métrica | Valor | Status |
|---------|-------|--------|
| Testes totais | ~1500 | ✅ |
| Testes falhando | 41 | ⚠️ Pré-existente |
| Coverage threshold | 80% | ✅ Configurado |
| Erros de lint | 190 | ⚠️ Pré-existente |
| Issues abertas | 2 | ✅ |
| Issues em lifecycle | 0 | ❌ Broken |
| Build | Passa | ✅ |
| CI Reliability | ⚠️ Server startup | Em correção |

---

## SDDs do MVP Multica

| SDD | Status | Tasks | Completas |
|-----|--------|-------|----------|
| `checkout-sem-pagamento` | ✅ Completo | 18 | 10 |
| `kds-mvp` | 🚀 Em andamento | 6 | 0 |
| `cardapio-publico` | 📋 Pendente | — | — |
| `acompanhamento-pedido` | 📋 Pendente | — | — |
| `qr-code-mesa` | 📋 Pendente | — | — |

---

## Ações Imediatas

1. **[Alta]** Corrigir 41 testes falhando (pré-existente)
2. **[Alta]** Corrigir 190 erros de lint (pré-existente)
3. **[Alta]** Completar PED-18, PED-19 (fluxo submitOrder)
4. **[Média]** Implementar lifecycle de issues
5. **[Média]** Criar coverage gate no CI

---

*Este arquivo deve ser atualizado manualmente ou via script automatizado.*