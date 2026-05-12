# Proposal: Melhorias no Fluxo de Desenvolvimento

## Intent

Implementar melhorias no fluxo de desenvolvimento do Pedi-AI para resolver problemas identificados na análise:

- **Processo**: Issue lifecycle quebrado, STATUS.md inexistente, numeração inconsistente
- **Qualidade**: 41 testes falhando, 190 erros de lint, coverage não verificado
- **Automação**: CI pouco confiável, sem automação de reports, shards hardcoded
- **Integração**: Adotar slash commands do gstack para reviews e QA

## Scope

### Sprint 1 — Processo Básico (Alta Prioridade)

1. Criar `openspec/changes/STATUS.md` (task #1)
2. Criar folders de lifecycle de issues: `in_progress/`, `review/`, `done/`, `blocked/` (#4)
3. Implementar numeração sequencial de issues (PED-###) (#6)
4. Adicionar coverage gate no CI (#5)
5. Corrigir dev server startup no CI usando `webServer` config (#11)
6. Corrigir 190 erros de lint com `pnpm lint --fix` (#3)

### Sprint 2 — Qualidade (Alta Prioridade)

7. Triar e corrigir 41 testes falhando (#2, #19)
8. Revisar exclusões de coverage no vitest.config.ts (#16)
9. Verificar números de coverage no codemap.md (#18)
10. Criar script de automação de relatórios (#7, #14)

### Sprint 3 — Integração GStack (Média Prioridade)

11. Adotar `/review` do gstack para code review
12. Adotar `/qa` do gstack para browser automation
13. Adotar `/ship` do gstack para release automation
14. Adotar `/office-hours` do gstack para refinamento de escopo
15. Adotar `/investigate` do gstack para debug sistemático

### Sprint 4 — Release Automation (Média Prioridade)

16. Adicionar changelog automatizado (`standard-version`) (#12)
17. Calcular shards E2E dinamicamente (#13)
18. Enforçar conventional commits (commitlint) (#15)
19. Adicionar `pnpm build` no pre-push hook (#9)
20. Consolidar workflows de CI (#8)

## Success Criteria

1. ✅ `openspec/changes/STATUS.md` existe e está atualizado
2. ✅ Lifecycle de issues funcionando (open → in_progress → review → done)
3. ✅ 0 erros de lint
4. ✅ Coverage gate no CI (falha se < 80%)
5. ✅ CI usa `webServer` config do Playwright
6. ✅ 41 testes falhando → triage e plano de correção
7. ✅ Todos os 25 itens de melhoria implementados

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking changes no CI | Baixa | Alto | Testar em branch separado |
| Testes revelarem issues profundos | Média | Médio | Triar antes de corrigir |
| Resistência a нововведения | Baixa | Baixo | Mantém processo existente |

## Effort Estimate

| Sprint | Tarefas | Complexidade |
|--------|---------|-------------|
| Sprint 1 | 6 | Baixa |
| Sprint 2 | 4 | Alta |
| Sprint 3 | 5 | Média |
| Sprint 4 | 5 | Média |