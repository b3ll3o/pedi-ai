# Archive Report: correcao-e2e-readme

## Change Summary

Correção do README E2E para refletir corretamente a cobertura de testes.

## Files Modified

| Arquivo | Mudança |
|---------|---------|
| `tests/e2e/README.md` | Removido "Recuperação de senha (cliente)" e "Recuperação de senha (admin)" da seção "Fluxos Sem Cobertura" |
| `tests/e2e/README.md` | Atualizado description de `tests/customer/auth.spec.ts` para incluir "recuperação de senha" |
| `tests/e2e/README.md` | Atualizado description de `tests/admin/auth.spec.ts` para incluir "recuperação de senha" |

## Evidence

- `tests/e2e/tests/customer/auth.spec.ts` linhas 51-54: teste "deve solicitar recuperação de senha"
- `tests/e2e/tests/admin/auth.spec.ts` linhas 51-54: teste "should request password reset and login with new password"

## Verification

Verificação Report: `openspec/changes/archive/2026-04-20-correcao-e2e-readme/verify-report.md`

## Archive Location

`openspec/changes/archive/2026-04-20-correcao-e2e-readme/`

## Status

**ARCHIVED** — Change completo e verificado.