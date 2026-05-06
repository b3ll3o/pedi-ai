# Proposal: Implementação de Testes Faltantes

## Intent

Implementar cobertura de testes (unitários, integração e E2E) para os fluxos críticos e de alto impacto que atualmente não possuem nenhum teste ou possuem cobertura insuficiente. O objetivo é atingir a meta de 80% de cobertura definida nas regras do projeto e garantir que todos os fluxos principais tenham teste E2E.

## Scope

### In Scope

**Fluxos Críticos (NENHUM teste existente):**
- Recuperação de senha (email de reset)
- Redefinição de senha (via link no email)
- Webhook Stripe (atualização de status de pagamento)
- Verificação de status Pix
- Atualização de status de pagamento
- Reembolso
- Cross-tab sync (BroadcastChannel API)
- Redirect após validação de QR code

**Fluxos de Alto Impacto (testes parciais ou faltantes):**
- Admin/Modificadores: CRUD grupos de modificadores, valores e associação a produtos
- Admin/Reativar restaurante
- Admin/Desativar produto
- Admin/Histórico de status de pedido
- Admin/Indicador de conexão realtime
- Admin/Analytics: itens mais vendidos, pedidos por período
- SEO metadata da landing page

**Infraestrutura de Testes:**
- Aprimorar mocks do Supabase para testes unitários de auth
- Adicionar fixtures compartilhadas para testes E2E
- Melhorar stubs de payment adapters (Pix, Stripe)

### Out of Scope

- Implementação de nova funcionalidade (apenas testes)
- Alterações na estrutura de domínio ou arquitetura
- Testes de performance/load
- Testes de segurança (pentest)
- Refatoração de código existente para facilitar testes (salvo se estritamente necessário)

## Approach

### Estratégia de Implementação

1. **Fase 1 — Testes de Pagamento (Críticos)**
   - Unit tests para `PixPaymentAdapter` e `StripePaymentAdapter`
   - Mock do webhook Stripe via `supabase.auth.admin` ou httptest
   - Integração: verificar status de pagamento via API
   - E2E: fluxo completo de pagamento ( Stripe e Pix simulado)

2. **Fase 2 — Testes de Autenticação (Críticos)**
   - Unit tests para `RecuperarSenhaUseCase` e `RedefinirSenhaUseCase`
   - E2E: fluxo de recuperação e redefinição de senha (via mailhog/mailpit local)

3. **Fase 3 — Testes de Offline/Sync (Críticos)**
   - Unit tests para `BroadcastChannel` sync
   - Integração: Service Worker com `supabase.functions.invoke`
   - E2E: teste de carrinho em múltiplas abas

4. **Fase 4 — Testes Admin/Modificadores**
   - Unit tests para domain entities (GrupoModificador, ValorModificador)
   - Application use cases (CriarGrupoModificadorUseCase, etc.)
   - E2E: CRUD completo de grupos e valores de modificadores

5. **Fase 5 — Testes Admin/Analytics e Configurações**
   - Unit tests para `AnalyticsService`
   - E2E: visualização de relatórios e métricas

6. **Fase 6 — SEO e Landing Page**
   - Unit tests: validação de metadata (next/metadata API)
   - E2E: verificação de OG tags, canonical, JSON-LD

### Stack de Testes

| Tipo | Framework | Padrão |
|------|-----------|--------|
| Unitário | Vitest | AAA (Arrange-Act-Assert) |
| Integração | Vitest + msw | Given/When/Then |
| E2E | Playwright + Cucumber | Gherkin |

### Organização dos Arquivos

```
tests/
├── unit/
│   ├── domain/
│   │   ├── admin/           # entidades e value objects
│   │   └── payment/         # adapters de pagamento
│   ├── application/
│   │   ├── auth/            # use cases de auth
│   │   └── admin/           # use cases admin
│   ├── lib/
│   │   ├── sync.test.ts     # BroadcastChannel
│   │   └── qr.test.ts       # redirect QR
│   └── services/
│       └── analyticsService.test.ts
├── integration/
│   ├── api/
│   │   ├── payments.test.ts
│   │   └── webhooks.test.ts
│   └── lib/
│       └── sync.integration.test.ts
└── e2e/
    └── tests/
        ├── admin/
        │   ├── modifier-groups.spec.ts
        │   ├── analytics.spec.ts
        │   └── restaurant-reactivate.spec.ts
        ├── auth/
        │   └── password-recovery.spec.ts
        ├── payment/
        │   ├── stripe.spec.ts
        │   └── pix.spec.ts
        ├── offline/
        │   └── cross-tab-sync.spec.ts
        └── seo/
            └── landing-metadata.spec.ts
```

## Affected Areas

| Área | Arquivos/Diretórios |
|------|---------------------|
| Auth (domain) | `src/domain/auth/` |
| Auth (application) | `src/application/autenticacao/services/` |
| Payment (infrastructure) | `src/infrastructure/payment/` |
| Offline/Sync | `src/lib/sync.ts`, `src/lib/offline.ts` |
| QR Code | `src/lib/qr.ts` |
| Admin/Modificadores | `src/domain/cardapio/`, `src/application/cardapio/` |
| Analytics | `src/application/admin/services/AnalyticsService.ts` |
| SEO/Landing | `src/app/page.tsx`, `src/app/layout.tsx` |
| E2E fixtures | `tests/e2e/fixtures/`, `tests/e2e/support/` |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Webhook Stripe difícil de testar localmente | Alta | Médio | Usar Stripe CLI para forward events ou mock via `supabase.functions.invoke` |
| Email de recovery em ambiente de teste | Alta | Alto | Configurar mailpit/mailhog local para capturar emails |
| BroadcastChannel não funciona em JSDOM | Alta | Alto | Testar apenas em browser real (Playwright) |
| Tempo de execução de E2E muito longo | Média | Baixo | Executar em paralelo, separar testes críticos dos secundários |
| Cobertura insuficiente se mocks não refletem comportamento real | Média | Alto | Usar contratos de API do Supabase para stubs |

## Rollback Plan

Se a implementação de testes revelar problemas sistêmicos ou exigir refatoração significativa:

1. **Reverter para estado anterior**: `git stash` ou `git checkout` dos arquivos de teste
2. **Manter testes existentes**: não remover cobertura já existente
3. **Abordagem incremental**: se um fluxo específico for muito complexo, adiar e cobrir outros fluxos primeiro
4. **Documentar impedimentos**: criar issue no repositório para fluxos que necessitem de redesign

## Success Criteria

1. **Cobertura mínima**: 80% de cobertura em todas as métricas (statements, branches, functions, lines)
2. **Fluxos críticos cobertos**: 8/8 fluxos críticos com pelo menos teste E2E
3. **Fluxos admin cobertos**: Modificadores, analytics e configurações com E2E
4. **Testes passando em CI**: Pipeline de CI configurado para executar todos os testes
5. **Zero regressions**: todos os testes existentes continuam passando
6. **Documentação**: README atualizado em `tests/` listando fluxos cobertos

## Métricas de Progresso

| Fase | Testes a Adicionar | Estimativa |
|------|-------------------|------------|
| Fase 1 | 8-10 testes (payment) | ~4h |
| Fase 2 | 6-8 testes (auth recovery) | ~3h |
| Fase 3 | 4-6 testes (offline sync) | ~3h |
| Fase 4 | 10-12 testes (modificadores) | ~5h |
| Fase 5 | 4-6 testes (analytics) | ~2h |
| Fase 6 | 3-4 testes (SEO) | ~1h |
| **Total** | **35-46 testes** | **~18h** |

## Next Step

Executar pipeline `sdd-spec` para criar as especificações detalhadas de cada fluxo de teste, seguido de `sdd-tasks` para gerar o checklist de implementação.
