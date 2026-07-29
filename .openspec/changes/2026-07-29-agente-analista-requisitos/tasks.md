# Tasks — Agente `analista-requisitos`

> **Mudança:** `#2026-07-29-agente-analista-requisitos`
> **Refs:** `proposal.md`, `design.md`

---

## Fase 1 — Provisionamento (P0 — bloqueante)

- [x] **T1.1** Criar skill `analista-requisitos` em `~/.hermes/skills/analista-requisitos/SKILL.md`
  - **Critério de pronto:** `skill_view(name='analista-requisitos')` retorna conteúdo com seções 1-8.
  - **Comando:** `mkdir -p ~/.hermes/skills/analista-requisitos && write_file SKILL.md`
- [x] **T1.2** Criar `docs/PO-SKILLS.md` (referência completa).
  - **Critério de pronto:** Arquivo existe, ≥20KB, ≥1000 linhas, 12 seções.
- [x] **T1.3** Criar `docs/PO-AGENT-PLAYBOOK.md` (playbook operacional).
  - **Critério de pronto:** Arquivo existe, ≥10KB, ≥300 linhas, 10 seções.
- [x] **T1.4** Atualizar `docs/INDICE.md` apontando para os novos docs.
  - **Critério de pronto:** Tabela de docs inclui entradas `PO-SKILLS` e `PO-AGENT-PLAYBOOK`.
- [x] **T1.5** Criar cron job `analista-requisitos-pedi-ai-daily`.
  - **Critério de pronto:** `cronjob(action='list')` mostra job ativo, schedule `0 3 * * *`.
- [x] **T1.6** Criar `.openspec/changes/2026-07-29-agente-analista-requisitos/{proposal,design,tasks}.md`.
  - **Critério de pronto:** Todos os 3 arquivos existem, formato compatível com `.openspec/AGENTS.md`.

## Fase 2 — Validação (P1 — antes da primeira execução automática)

- [ ] **T2.1** PR de demonstração aberto pelo agente (este PR).
  - **Critério de pronto:** PR aberto em `b3ll3o/pedi-ai` com título Conventional Commits.
- [ ] **T2.2** Skill testada em modo manual (`hermes chat -q "..."`).
  - **Comando:** `hermes chat -q "Analise o /root/pedi-ai e sugira PR"`
  - **Critério de pronto:** Resposta inclui referência a `docs/PO-SKILLS.md` e classifica por categoria.
- [ ] **T2.3** Cron job visível e pausável.
  - **Comando:** `cronjob(action='list')` e `cronjob(action='pause', job_id='b026cb0403b8')`.
- [ ] **T2.4** Documentar uso no `docs/INDICE.md`.
  - **Critério de pronto:** Seção "Agentes" ou "Automações" lista o `analista-requisitos`.

## Fase 3 — Operação (P2 — melhorias contínuas)

- [ ] **T3.1** Adicionar métrica `agente_prs_abertos` ao Prometheus.
  - **Critério de pronto:** Gauge `agente_prs_abertos_total` no `/metrics`.
- [ ] **T3.2** Smoke test E2E do agente (workflow Playwright).
  - **Critério de pronto:** Spec E2E `analista-requisitos.spec.ts` valida abertura de PR simulado.
- [ ] **T3.3** Pular execução automática se `master` não mudou desde último PR.
  - **Critério de pronto:** Skill inclui `git log origin/master..HEAD --oneline` check.
- [ ] **T3.4** Auto-archive de PRs antigos (>30d sem feedback) como `stale`.
- [ ] **T3.5** Dashboard Grafana com gráfico de PRs/dia + categorias.

---

## Como usar

### Disparar manualmente

```bash
hermes cronjob run --job-id b026cb0403b8
```

### Pausar

```bash
hermes cronjob pause --job-id b026cb0403b8
```

### Retomar

```bash
hermes cronjob resume --job-id b026cb0403b8
```

### Visualizar configuração

```bash
hermes cronjob list
```

### Editar skill

```bash
vim ~/.hermes/skills/analista-requisitos/SKILL.md
```

### Recriar do zero

```bash
hermes cronjob remove --job-id b026cb0403b8
# Recriar via hermes cronjob create com mesmo name/schedule/prompt
```

---

## Critérios de Pronto Global

- [x] Skill carregável
- [x] Docs completos
- [x] Cron job agendado
- [x] OpenSpec spec completa (proposal + design + tasks + RF-AGENT-01)
- [x] PR demonstrativo aberto
- [ ] PR mergeado
- [ ] Primeira execução automática bem-sucedida (2026-07-30 00:00 BRT-3)
- [ ] 7 dias de operação limpa (sem abertura duplicada, sem quebra)

## Métricas de Acompanhamento

| Métrica                     | Como medir                                                   | Frequência |
| --------------------------- | ------------------------------------------------------------ | ---------- |
| PRs abertos pelo agente     | `gh pr list --author "analista-requisitos[bot]"`             | semanal    |
| PRs rejeitados              | `gh pr list --state closed --search "author:... closed:..."` | semanal    |
| Tempo médio entre execuções | `cronjob list` next_run_at                                   | diária     |
| Cobertura afetada           | `pnpm test:coverage` antes/depois                            | por PR     |
| Conformidade OpenSpec       | `pnpm rtm`                                                   | por PR     |
