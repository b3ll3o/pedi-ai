# Proposal: Admin Full Implementation

## Intent

Implementar todas as funcionalidades do painel administrativo do Pedi-AI conforme especificado em `openspec/specs/admin/spec.md`, incluindo:
- Autenticação e autorização (RBAC)
- CRUD completo de categorias, produtos, modifiers, combos, mesas, pedidos, e usuários
- Dashboard de analytics
- Página de configurações
- Revisão e reprojetamento da UI existente

## Scope

### In Scope

**Fase 1 - Núcleo (Pedidos + Cardápio) - Prioridade Alta**
- Autenticação admin via Supabase Auth
- Middleware para proteção de rotas admin
- CRUD de Categorias (criar, editar, deletar com soft-delete, reordenar)
- CRUD de Produtos (criar, editar, deletar com soft-delete)
- CRUD de Modifiers Groups e Modifier Values
- CRUD de Combos (bundle pricing)
- Listagem e detalhamento de Pedidos com filtros
- Atualização de status de pedidos

**Fase 2 - Infraestrutura**
- Sistema de roles (owner, manager, staff) com RBAC aplicado
- Obtenção de `restaurant_id` da sessão autenticada (substituir hardcoded 'demo-restaurant')
- Correção de URLs mismatched entre AdminLayout e rotas

**Fase 3 - Completude**
- CRUD de Mesas com geração de QR codes
- Gerenciamento de Usuários
- Dashboard de Analytics (orders per period, popular items)
- Página de Configurações

### Out of Scope

- Funcionalidades de consumidor (app do cliente)
- Integração com gateways de pagamento (já existe spec separada)
- Funcionalidades offline para admin (futuro)
- Relatórios avançados de analytics beyond dashboard básico

## Approach

### Estratégia Geral
1. **Revisão de UI primeiro**: Analisar a UI existente, corrigir URLs mismatched, e reprojetar onde necessário antes de integrar com APIs
2. **API-first**: Implementar todas as APIs REST primeiro
3. **Integração progressiva**: Conectar UI às APIs incrementalmente
4. **RBAC completo**: Implementar middleware e aplicar permissões em todas as rotas

### Fases de Implementação

```
Fase 1 (Núcleo)
├── 1.1 Correção URLs AdminLayout
├── 1.2 Middleware de autenticação
├── 1.3 APIs de Categorias
├── 1.4 APIs de Produtos
├── 1.5 APIs de Modifiers
├── 1.6 APIs de Combos
├── 1.7 UI de Categorias (integrada)
├── 1.8 UI de Produtos (integrada)
├── 1.9 UI de Modifiers/Combos
└── 1.10 UI de Pedidos

Fase 2 (Infraestrutura)
├── 2.1 Sistema de Roles + RBAC
├── 2.2 Correção restaurant_id dinâmico
└── 2.3 Validações client/server

Fase 3 (Complementos)
├── 3.1 CRUD Mesas + QR
├── 3.2 CRUD Usuários
├── 3.3 Analytics Dashboard
└── 3.4 Página Configurações
```

## Affected Areas

| Área | Arquivos/Rotas | Impacto |
|------|----------------|---------|
| `/admin/*` | Páginas admin | Alto - todas as rotas |
| `/src/app/api/admin/*` | APIs REST | Alto - novos endpoints |
| `/src/components/admin/*` | Componentes UI | Alto - revisão e integração |
| `/src/services/*.ts` | Serviços admin | Médio - já existem |
| `/src/middleware.ts` | Middleware auth | Alto - novo |
| `/src/lib/auth.ts` | Helpers auth | Médio - extensões necessárias |
| `openspec/specs/admin/spec.md` | Spec principal | Manter como fonte verdade |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| URLs admin inconsistentes causem confusão | Alta | Médio | Revisar todas as URLs primeiro |
| `restaurant_id` hardcoded em múltiplos lugares | Alta | Alto | Criar helper centralized para obter da session |
| RBAC não aplicado corretamente | Média | Alto | Implementar testes E2E para cada role |
| UI existente com padrões inconsistentes | Média | Médio | Criar design system review antes de implementar |
| Breaking changes em APIs afetem cliente | Baixa | Alto | Manter compatibilidade ou versionar APIs |

## Rollback Plan

1. **Feature flags**: Implementar feature flags para cada módulo admin
2. **Deploy incremental**: Deploy por fase, com rollback simples desabilitando flags
3. **Branch dedicada**: Trabalhar em branch `feature/admin-full` até completar
4. **Preservar versão anterior**: Manter UI stubs como fallback se necessário

## Success Criteria

- [ ] Todas as APIs admin respondem corretamente com `restaurant_id` dinâmico
- [ ] Middleware bloqueia acesso não autenticado e redireciona para login
- [ ] RBAC respeitado: owner tem acesso total, manager acesso parcial, staff apenas pedidos
- [ ] CRUD de categorias, produtos, modifiers, combos, mesas, pedidos funciona end-to-end
- [ ] Dashboard de analytics exibe dados corretos por período
- [ ] UI responsiva (mobile-first) e acessível
- [ ] Testes E2E para fluxos admin críticos
- [ ] Cobertura de testes unitários >= 80%

## Complexity Assessment

| Dimensão | Rating | Justificativa |
|----------|--------|---------------|
| Logic depth | High | Múltiplos fluxos CRUD com validações, soft-delete, reordenamento |
| Contract sensitivity | High | APIs REST e schema de banco, auth tokens, RBAC |
| Context span | High | Múltiplas fases, muitas dependências entre componentes |
| Discovery need | Medium | UI existente precisa ser revisada, padrões a definir |
| Failure cost | High | Admin é crítico para operação do restaurante |
| Concern coupling | High | Auth, RBAC, CRUD, UI, Analytics - todos interdependentes |

**Recomendação**: Full SDD (propose → spec → design → tasks)

---

## Summary

- **Change**: admin-full-implementation
- **Artifact**: `openspec/changes/admin-full-implementation/proposal.md`
- **Scope**: Full admin panel - auth, RBAC, CRUD (categories, products, modifiers, combos, tables, orders, users), analytics, settings
- **Priority**: Pedidos + Cardápio primeiro (Fase 1)
- **Approach**: UI review → API-first → Progressive integration
- **Persistence**: OpenSpec (repo files)