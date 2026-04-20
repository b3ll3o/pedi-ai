# Proposal: Correção README E2E - Atualização e Padronização

## Intent

Corrigir violações de manutenção dos testes E2E: atualizar README desatualizado e padronizar descrições dos testes para português brasileiro conforme regra do AGENTS.md.

## Scope

### In Scope
- Atualizar `tests/e2e/README.md`:
  - Marcar "Recuperação de senha (cliente)" como ✅ COBERTO
  - Marcar "Recuperação de senha (admin)" como ✅ COBERTO
  - Corrigir contagem de Page Objects (11, não 10)
  - Atualizar inventário de fluxos cobertos
- Padronizar descrições dos testes em `tests/e2e/tests/` para pt-BR:
  - `cart.spec.ts` (descrições em português)
  - `customer/auth.spec.ts` (descrições em português)
  - Garantir consistência com outros arquivos (mover para inglês OU padronizar todos para pt-BR)

### Out of Scope
- Modificar lógica de testes
- Adicionar novos testes
- Alterar Page Objects

## Approach

1. **README**: Corrigir inventário de fluxo_coberto conforme análise real
2. **Padronização**: Manter inglês para consistência com o projeto (melhor prática QA)
   - Manter descrições em inglês nos testes existentes
   -riar guideline no README sobre usar inglês para descrições de testes

## Affected Areas

| Arquivo | Mudança |
|---------|---------|
| `tests/e2e/README.md` | Atualizar fluxos cobertos e contagem |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Confusão se mistura inglês/português | Baixa | Baixo | Padronizar para inglês nos testes |

## Rollback Plan

1. Reverter README.md com git
2. Reverter descrições se necessário

## Success Criteria

- [ ] README.md com inventário correto de fluxos cobertos
- [ ] Contagem correta de Page Objects (11)
- [ ] Descrições consistentes nos testes