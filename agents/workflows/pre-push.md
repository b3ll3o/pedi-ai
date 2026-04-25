# Pre-Push Agent Workflow

Execute este workflow antes de cada `git push` para garantir que o código está limpo e testado.

## Processo

### Fase 1: Documentação
- [ ] Verificar se há documentação desatualizada (`README.md`, `AGENTS.md`, specs em `openspec/specs/`)
- [ ] Se documentação precisa de update: editar arquivos necessários
- [ ] Atualizar `codemap.md` se estrutura do projeto mudou

### Fase 2: Testes Unitários
- [ ] Executar `pnpm test`
- [ ] Se testes falharem: diagnosticar erro e corrigir
- [ ] Commit intermediário se necessário (`git commit -m "fix: resolve test failures"`)

### Fase 3: Testes E2E
- [ ] Executar `pnpm test:e2e:seed` (seed de dados de teste)
- [ ] Se seed falhar: verificar se banco Supabase está acessível e migrations aplicadas
- [ ] Executar `pnpm test:e2e`
- [ ] Se testes falharem: diagnosticar e corrigir

### Fase 4: Linter
- [ ] Executar `pnpm lint`
- [ ] Se houver errors: corrigir manualmente
- [ ] Se houver warnings auto-fixable: executar `pnpm lint --fix`
- [ ] Se warnings persistirem (unused vars, imports não utilizados, etc): **delegar ao agente IA para correção automática** — não deixar para correção manual

### Fase 5: Verificação Final
- [ ] Executar `pnpm lint` novamente para confirmar 0 errors
- [ ] Executar `pnpm test` para confirmar todos passando

### Fase 6: Commit e Push
- [ ] `git status` para ver alterações
- [ ] `git add -A`
- [ ] `git diff --staged --quiet` — se vazio (nenhuma mudança), pular commit
- [ ] `git commit -m "chore: pre-push checks passed"` (ou mensagem descritiva)
- [ ] `git push`

---

## Regras de Decisão

### Testes falhando
- **Unit tests**: Corrigir o código, não desabilitar testes
- **E2E flaky**: Investigar se é problema de timing (aumentar timeout) ou bug real
- **Seed falha**: Verificar `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`

### Linter warnings (corrição automática pelo agente)
- **`<a>` vs `<Link>`**: Sempre usar `next/link`
- **Unused vars**: Remover se claramente dispensável; prefixar com `_` se potencialmente útil
- **Imports não utilizados**: Remover
- **Após correção**: rodar `pnpm lint` novamente para confirmar 0 warnings (ou no mínimo 0 errors)

### Warnings persistentes
- Se ESLint sinalizar `_var` como unused: configurar `.eslintrc` com `varsIgnorePattern: "^_"`

---

## Quick Reference

```bash
# Sequência completa
pnpm test && pnpm test:e2e:seed && pnpm test:e2e && pnpm lint --fix && git add -A && git commit -m "chore: pre-push" && git push
```

---

## Critério de Sucesso

Push só acontece se:
- ✅ 0 erros de lint (warnings são desejáveis mas não bloqueiam se correção automática não for viável)
- ✅ Todos os unit tests passando
- ✅ Seed executa sem erro (mesmo se testes E2E falhem por dados)
- ✅ Commits limpos com mensagens descritivas

> **Nota**: Warnings de lint (unused vars, imports não utilizados) DEVEM ser corrigidos pelo agente de IA automaticamente antes do push. Apenas se a correção requerer decisão de negócio ou risco de breaking change, escalar para o usuário via `question`.
