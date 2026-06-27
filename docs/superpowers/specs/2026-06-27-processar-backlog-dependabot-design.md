# Design — Processar backlog de dependabot + limpar branch stale

**Data**: 2026-06-27
**Status**: Aprovado pelo usuário
**Autor**: Claude (brainstorming + execução subsequente)

## Contexto

Inventário realizado em 2026-06-27 identificou:

- **15 branches remotas**: 1 master, 1 stale (`chore/test-cleanup-and-env`), 13 dependabot automáticas
- **34 PRs**: 10 abertas (todas dependabot), 24 fechadas
- **Branch `chore/test-cleanup-and-env`**: órfã, 0 commits à frente e 62 atrás do master. Seu conteúdo **apagaria o trabalho de feature-flags** já merged em master (`43f1d6d`, `0bce969`, `2291e9f`, `544d426`, `d826950`).
- **PRs dependabot**: abertas em 25/05/2026 com auto-merge desabilitado (>30 dias). Master moveu ~1 mês desde então.

## Decisões (já aprovadas)

1. **Branch stale**: deletar (local e remoto) sem reaproveitamento.
2. **PRs dependabot**: tentar rebase das branches existentes e merge direto. Se inviável, cherry-pick do diff.
3. **Prisma 7**: implementar agora, ajustando o necessário.
4. **Escopo**: processar TODAS as 11 PRs (incluindo MAJORs).

## Escopo

### Fase 0 — Limpeza da branch stale

**Ação**: `git push origin --delete chore/test-cleanup-and-env` + `git branch -d origin/chore/test-cleanup-and-env`.

**Justificativa**: galho órfão cujo conteúdo é destrutivo e redundante com master. As poucas adições (Dockerfile, cucumber.json) são **regressões** em relação ao master atual:

- Troca `node:20.18.0-alpine` (fixo) por `node:20-alpine` (flutuante) — perde reprodutibilidade (Auditoria B-04)
- Remove `--frozen-lockfile` — perde lock
- Usa `pnpm dlx prisma@5.22.0` em vez de `pnpm exec prisma generate` — baixa da net a cada build
- Remove comentários de aviso sobre `JWT_SECRET` placeholder — **regressão de segurança**
- Troca `wget` (Alpine) por `curl` (Debian) sem motivo

**Saída**: branch inexistente no remoto e no local.

### Fase 1 — PRs de baixo risco (6 merges)

Processadas sequencialmente, cada merge atualiza o master que serve de base para a próxima.

| #   | PR                                               | Mudança                                          | Arquivos afetados                                               | Verificação pós-merge              |
| --- | ------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------- |
| 1.1 | [#26](https://github.com/b3ll3o/pedi-ai/pull/26) | `eslint-config-prettier` 9.1.2 → 10.1.8          | `package.json` (root)                                           | `pnpm lint`                        |
| 1.2 | [#25](https://github.com/b3ll3o/pedi-ai/pull/25) | `@types/uuid` 10.0.0 → 11.0.0                    | `package.json` (root)                                           | `pnpm --filter @pedi-ai/api build` |
| 1.3 | [#33](https://github.com/b3ll3o/pedi-ai/pull/33) | `actions/checkout` v6 → v7                       | `.github/workflows/deploy-vps.yml`, `.github/workflows/e2e.yml` | Inspeção + CI                      |
| 1.4 | [#19](https://github.com/b3ll3o/pedi-ai/pull/19) | `actions/download-artifact` v7 → v8              | `.github/workflows/e2e.yml`                                     | Inspeção + CI                      |
| 1.5 | [#24](https://github.com/b3ll3o/pedi-ai/pull/24) | `@types/node` 22 → 25 em `apps/api` e `apps/web` | `apps/api/package.json`, `apps/web/package.json`                | `pnpm build` em ambos              |
| 1.6 | [#23](https://github.com/b3ll3o/pedi-ai/pull/23) | `typescript` 5.9.3 → 6.0.3 em `apps/web`         | `apps/web/package.json`                                         | `pnpm --filter @pedi-ai/web build` |

**Operação por PR**:

1. `git fetch origin <branch>`
2. `git rebase master` (resolver conflitos se houver; fallback: aplicar via `git diff master..origin/<branch> | git apply` se o rebase falhar)
3. Verificação específica do app afetado
4. `git push origin <branch> --force-with-lease`
5. `mcp__plugin_github_github__merge_pull_request` (squash)
6. Deletar branch (`git push origin --delete <branch>`)

### Fase 2 — Fechamento de PR stale

**#10** — `actions/github-script` v7 → v9. Confirmado via `grep -rn "github-script" .github/` que **nenhuma** referência existe nos workflows.

**Ação**: `mcp__plugin_github_github__update_pull_request` com `state: "closed"` + comentário explicativo ("Action não utilizada no projeto").

### Fase 3 — PRs MAJOR com adaptação

| #   | PR                                               | Mudança                                | Adaptações esperadas                                                                                                                                            |
| --- | ------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | [#20](https://github.com/b3ll3o/pedi-ai/pull/20) | `appleboy/ssh-action` v0.1.10 → v1.2.5 | v1.x mudou para sintaxe SSH CLI. Auditar 7 referências em `.github/workflows/deploy-vps.yml`. Inputs `host`, `username`, `key`, `command` continuam suportados. |
| 3.2 | [#28](https://github.com/b3ll3o/pedi-ai/pull/28) | `@prisma/client` 5.22.0 → 7.8.0        | Auditar `apps/api/scripts/*` por `--shadow-database-url` (removido em v7). Verificar `apps/api/prisma/schema.prisma` por features removidas.                    |
| 3.3 | [#27](https://github.com/b3ll3o/pedi-ai/pull/27) | `prisma` 5.22.0 → 7.8.0 (CLI)          | Par do #28. Atualizar Dockerfile.api que usa `pnpm dlx prisma@5.22.0` → `pnpm exec prisma`.                                                                     |

3.2 e 3.3 podem ser combinados em um único merge (mesma versão, mudanças relacionadas).

## Fluxo de operação por PR (detalhado)

```bash
# Setup
git fetch origin <branch>
git checkout <branch>
git rebase master
# Se conflito: resolver manualmente, depois `git rebase --continue`

# Verificação
<comando específico da PR>

# Push
git push origin <branch> --force-with-lease

# Merge via MCP
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=<N>,
  merge_method="squash"
)

# Limpeza
git push origin --delete <branch>
```

## Riscos e mitigações

| Risco                                                      | Probabilidade | Impacto            | Mitigação                                                                                      |
| ---------------------------------------------------------- | ------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| Rebase gerar conflitos (master moveu 1 mês)                | Alta          | Médio              | Resolver conflitos manuais; fallback: cherry-pick do diff puro da PR                           |
| Prisma 7 quebrar migração DDD em andamento                 | Média         | Alto               | Auditar scripts antes; `pnpm prisma validate` como gate; você valida migrations contra DB real |
| ssh-action v1 mudar comportamento de deploy                | Média         | Médio (sem deploy) | Revisar changelog v1; **não testar contra VPS real** (você valida depois)                      |
| CI quebrar com actions v7/v8 (download-artifact, checkout) | Baixa         | Baixo              | Mergear uma de cada vez, monitorar cada CI                                                     |
| Regressão de tipos com TS 6.0.3 em apps/web                | Média         | Médio              | Build local antes de merge; se quebrar, reverter merge e investigar                            |

## Limites explícitos (NÃO faço)

- ❌ Não rodo migrations contra DB real
- ❌ Não disparo deploy na VPS
- ❌ Não abro issues de follow-up
- ❌ Não mexo em código fora do escopo das PRs
- ❌ Não instalo `jq` (uso `python3` para parse JSON)

## Saída esperada

Após execução completa:

- 9 PRs merged em master (6 da Fase 1 + 3 da Fase 3)
- 1 PR fechada como not-planned (#10 da Fase 2)
- 1 branch stale deletada (`chore/test-cleanup-and-env`)
- 10 branches dependabot deletadas (após merge das suas PRs)
- 0 branches stale remanescentes além de master
- Relatório final com: status de cada PR, conflitos encontrados, adaptações aplicadas, próximos passos manuais para você

## Métricas de progresso

A cada fase concluída, comunicar:

- ✅ PRs merged e seus SHAs
- ❌ PRs fechadas (motivo)
- ⚠️ Conflitos/adaptações necessárias
- 🟡 Validações pendentes para você (migrations, deploy)
