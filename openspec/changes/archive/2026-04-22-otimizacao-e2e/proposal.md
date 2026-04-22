# Proposal: Otimização de Testes E2E

## Intent

Melhorar a velocidade, confiabilidade e manutenibilidade dos testes E2E do Pedi-AI, reduzindo o tempo de execução em pelo menos 50% e eliminando flaky tests.

## Problem Statement

- Testes E2E estão lentos (>10 min para suite completa)
- Flaky tests causam desconfiança na suite
- Não há execução seletiva (sempre roda tudo)
- Não há network optimization (recursos externos não são bloqueados)
- Fixtures não são otimizados para reuso

## Scope

### In Scope
1. **Network Optimization**
   - Bloquear requests a fonts.googleapis.com, fonts.gstatic.com
   - Bloquear tracking/analytics externos
   - Bloquear imagens de placeholder não essenciais

2. **Test Execution Optimization**
   - Adicionar tags (@critical, @slow, @smoke)
   - Configurar test sharding para CI
   - Criar script npm para execução seletiva

3. **Fixtures Enhancement**
   - Adicionar fixture de sessão autenticada com reuse (share credentials entre testes)
   - Criar fixture de "clean state" com/teardown otimizado

4. **Stability Improvements**
   - Implementar soft assertions para colectar todos os erros
   - Adicionar retry策略 para testes específicos (@flaky)
   - Melhorar selectors para usar role-based locators

5. **Parallel Execution**
   - Configurar workers dinâmicos baseado em CPU
   - Habilitar reuseExistingServer para dev local

### Out of Scope
- Refactoring de Page Objects (já existe estrutura boa)
- Migration para outro framework
- Testes de performance/load
- Visual regression testing completo

## Approach

1. **Fase 1**: Network blocking e optimization (1h)
   - Adicionar route interception para bloquear recursos externos
   - Atualizar playwright.config.ts

2. **Fase 2**: Tags e sharding (1h)
   - Adicionar @critical, @smoke, @slow aos testes
   - Configurar CI sharding

3. **Fase 3**: Fixtures e soft assertions (2h)
   - Criar authenticated reuse fixture
   - Implementar soft assertions em helper

4. **Fase 4**: Verificação (1h)
   - Medir tempo antes/depois
   - Verificar que todos os testes passam

## Affected Areas

- `playwright.config.ts` - configurações de execution
- `tests/e2e/tests/shared/fixtures/index.ts` - novos fixtures
- `tests/e2e/tests/shared/helpers/` - soft assertions
- `tests/e2e/package.json` - novos scripts

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Bloquear recurso necessário | Baixa | Testes falham | Whitelist de domínios |
| Soft assertion mudar comportamento | Baixa | Falhas não detectadas | Manter como complementares |

## Rollback Plan

- Reverter changes em playwright.config.ts
- Remover tags dos testes
- Restore fixtures originais

## Success Criteria

- [ ] Tempo de execução < 5 min (local, chromium only)
- [ ] 0 flaky tests identificados
- [ ] Scripts npm: `test:e2e:smoke`, `test:e2e:critical` funcionando
- [ ] CI sharding configurado (4 shards)
- [ ] Network blocking ativo e funcionando