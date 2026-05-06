# Proposal: Melhorias de Arquitetura DDD e Consolidação

## Intent

Consolidar a arquitetura DDD do Pedi-AI, eliminando duplicações, completando implementações incompletas e migran do código legacy para a estrutura DDD. O objetivo é garantir consistência entre as camadas domain/application/infrastructure, reduzir dívida técnica e preparar a base para futuras funcionalidades.

## Scope

### In Scope

1. **Eliminação de Duplicações**
   - Consolidar `Dinheiro` em `shared/value-objects/` (atualmente duplicado em `pedido/`)
   - Unificar `MetodoPagamento` — definir ownership único (ou `pagamento/` ou `pedido/`)
   - Remover duplicação de `VALID_STATUS_TRANSITIONS` entre `services/` e domain

2. **Completar Infraestrutura**
   - Implementar repositórios concretos em `infrastructure/persistence/` para todos os contextos que ainda têm apenas interfaces
   - Verificar e completar `PagamentoRepository`

3. **Definir Ownership de Events**
   - `PagamentoConfirmadoEvent` existe em ambos `pedido/` e `pagamento/` — definir qual contexto é o dono

4. **Documentar Events**
   - Events em `mesa/` e `cardapio/` não estão documentados — definir events de domínio para esses contextos

5. **Completar Testes E2E**
   - Fluxo completo de redefinição de senha (enviar email → clicar link → redefinir → login)

### Out of Scope

- Migrar lógica de UI (componentes React) para usar use cases — será feito em mudança separada
- Refatorar `lib/offline/sync.ts` (baixa prioridade)
- Limpeza de exports não usados

## Approach

### Fase 1: Análise e Definição (1 sessão)
- Analisar dependências entre contextos para definir ownership correto de `MetodoPagamento` e `PagamentoConfirmadoEvent`
- Documentar events faltantes em `mesa/` e `cardapio/`

### Fase 2: Consolidação de Value Objects e Events (2-3 sessões)
- Mover `Dinheiro` para `shared/value-objects/`
- Unificar `MetodoPagamento` e atualizar contextos dependentes
- Atualizar `PagamentoConfirmadoEvent` para ter um único dono
- Documentar events de `mesa/` e `cardapio/`

### Fase 3: Implementação de Repositórios (2-3 sessões)
- Implementar `PagamentoRepository` em `infrastructure/persistence/pagamento/`
- Implementar repositórios restantes para `mesa/`, `cardapio/`
- Atualizar exports em `infrastructure/persistence/index.ts`

### Fase 4: Eliminação de Duplicações (1-2 sessões)
- Remover `VALID_STATUS_TRANSITIONS` duplicado de `services/adminOrderService.ts`
- Remover `canManageRole()` duplicado de `services/userService.ts`
- Atualizar dependentes para usar domain

### Fase 5: Testes E2E (1 sessão)
- Completar testes do fluxo de redefinição de senha

## Affected Areas

| Área | Impacto |
|------|---------|
| `src/domain/shared/value-objects/` | Adicionar `Dinheiro` |
| `src/domain/pedido/value-objects/Dinheiro.ts` | Mover para shared |
| `src/domain/pagamento/value-objects/MetodoPagamento.ts` | Unificar com `pedido/` |
| `src/domain/pedido/events/PagamentoConfirmadoEvent.ts` | Aclarar ownership |
| `src/domain/mesa/events/` | Documentar events |
| `src/domain/cardapio/events/` | Documentar events |
| `src/infrastructure/persistence/pagamento/` | Implementar repositório |
| `src/infrastructure/persistence/mesa/` | Implementar repositório |
| `src/infrastructure/persistence/cardapio/` | Implementar repositório |
| `src/services/adminOrderService.ts` | Remover duplicação |
| `src/services/userService.ts` | Remover duplicação |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Breaking changes em código dependente ao mover `Dinheiro` | Média | Alto | Atualizar todos os imports antes de commitar |
| Conflicts com mudança ativa `fluxo-redefinicao-senha` | Baixa | Médio | Verificar se há trabalho paralelo antes de implementar |

## Rollback Plan

1. **Se breaking changes em Value Objects**: Reverter apenas os arquivos movidos/alterados via `git checkout`
2. **Se problemas em repositórios**: Manter interfaces intactas, reverter implementações concretas
3. **Se testes falharem**: Reverter changes e corrigir imports

**Comando de rollback:**
```bash
git checkout HEAD~1 -- src/domain/shared/value-objects/Dinheiro.ts src/domain/pedido/value-objects/Dinheiro.ts
```

## Success Criteria

1. **Cobertura de testes mantida**: 80%+ após as mudanças
2. **Zero duplicações**: `grep -r "class Dinheiro"` retorna apenas 1 resultado
3. **Repositórios implementados**: Todos os contextos têm implementação concreta em `infrastructure/persistence/`
4. **Events documentados**: Todos os bounded contexts têm arquivo `events/index.ts` exportando seus events
5. **Build passa**: `npm run build` completa sem erros
6. **Tests passam**: `npm run test` e `npm run test:e2e` passam
