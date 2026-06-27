---
codigo: RF-ADM-FF-10
titulo: Painel admin de feature flags
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 284)
---

# RF-ADM-FF-10 — Painel admin de feature flags

## Ator

`owner` ou `manager` autenticado na UI Next.js.

## Trigger

Navegação para `/admin/feature-flags`.

## Pré-condições

- Sessão autenticada com papel `owner` ou `manager` no restaurante escopo.

## Pós-condições

- Tabela com todas as flags (RF-ADM-FF-01 client-side).
- Botão de toggle on/off por linha (RF-ADM-FF-04 client-side).
- Botão "Gerenciar overrides" abre modal com formulário (RF-ADM-FF-05/06 client-side).
- Aba "Audit log" abre painel lateral com últimos 50 eventos (RF-ADM-FF-09 client-side).
- Estados de erro, carregando e vazio explícitos (loading skeleton + empty state + toast de erro).

## Regras de negócio

- MUST exibir tooltip "Propagação pode levar até 30 s" perto do toggle.
- MUST confirmar antes de mutação destrutiva (excluir override).
- MUST exibir timestamps relativos ("há 2 min") em audit log.
- i18n pt-BR (RNF-I18N-FF-01).

## Materialização

- `apps/web/src/components/admin/feature-flags/PainelFeatureFlags.tsx` (`@spec(RF-ADM-FF-10)`)
- `apps/web/src/components/admin/feature-flags/TabelaFeatureFlags.tsx`
- `apps/web/src/components/admin/feature-flags/ModalOverrideFeatureFlag.tsx`
- `apps/web/src/components/admin/feature-flags/AuditLogViewer.tsx`

## Cenário BDD

`features/admin/feature-flags/ui-painel.feature`:

- `Cenário: Owner liga flag via toggle e vê confirmação`.
- `Cenário: Manager abre modal de override mas não vê botão "Salvar" (RBAC visual)`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 284)
