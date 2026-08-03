# Design — Agente `analista-requisitos`

> **Mudança:** `#2026-07-29-agente-analista-requisitos`
> **Refs:** `proposal.md`, `tasks.md`, `docs/PO-SKILLS.md`, `docs/PO-AGENT-PLAYBOOK.md`

---

## 1. Visão Geral

```
┌──────────────────────────────────────────────────────────────┐
│                  Cron (00:00 BRT-3)                          │
│  ┌────────────────────────────┐                              │
│  │ Job: b026cb0403b8         │                              │
│  │ Skills: [analista-requisitos]                              │
│  │ Workdir: /root/pedi-ai    │                              │
│  └─────────────┬──────────────┘                              │
│                │                                             │
│                ▼                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Ler docs (PO-SKILLS, PO-AGENT-PLAYBOOK, AGENTS.md)   │  │
│  │ 2. git log origin/master -20 + gh pr list --state open  │  │
│  │ 3. Cruzar com docs/auditorias/PLANO_AUDITORIA_2026-07-29.md (P0/P1/P2)  │  │
│  │ 4. Identificar 1 item de alto impacto ainda aberto       │  │
│  │ 5. Criar branch + implementar/criar spec                │  │
│  │ 6. git rebase master                                     │  │
│  │ 7. git push + gh pr create                               │  │
│  │ 8. Reportar URL do PR no chat (origin)                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 2. Requisitos Funcionais (RF-AGENT)

### `RF-AGENT-01` — Análise diária e abertura de PR

**Ator:** Agente `analista-requisitos` (não-interativo, mas com
`attach_to_session: true` para permitir follow-up).

**Trigger:** Cron job `0 3 * * *` (UTC) = **00:00 BRT-3** diário.

**Pré-condições:**

- Skill `analista-requisitos` carregada.
- Workdir `/root/pedi-ai` com `git` em estado limpo.
- `gh` ou SSH para push disponíveis.

**Pós-condições:**

- **1 PR** aberto (ou relatório "sem sugestão relevante hoje" enviado
  ao chat se nenhum item de impacto foi identificado).
- Branch `feat/<escopo>-<slug>` ou `fix/<escopo>-<slug>` baseada em `master`.
- Cobertura ≥80% mantida (se PR tocar código).
- Mensagem no chat atual (Discord) com URL do PR + framework + métrica.

**Regras de negócio:**

- **MUST** ler `docs/auditorias/PLANO_AUDITORIA_2026-07-29.md` antes de sugerir — não
  duplicar P0/P1/P2 já filed no PR #57.
- **MUST** classificar cada item por **categoria primária** (vide
  `PO-SKILLS.md §7`).
- **MUST** priorizar via **RICE/MoSCoW/Kano/WSJF/ICE** (justificar 1 linha).
- **MUST** linkar `RF-XXX-NN` ou `RNF-X-NN` se mudar comportamento.
- **MUST** usar Conventional Commits (`tipo(escopo): descrição`).
- **MUST NOT** propor Stripe (PIX-only, vide `docs/COMPANY.md`).
- **MUST NOT** quebrar cobertura mínima de 80%.
- **MUST NOT** abrir PR de futilidade.
- **SHOULD** sugerir métrica de sucesso pós-merge.
- **MAY** gerar PR de spec OpenSpec pura (sem código) se apropriado.

**Materialização:**

- `.openspec/changes/2026-07-29-agente-analista-requisitos/` (este PR)
- `docs/PO-SKILLS.md` (referência)
- `docs/PO-AGENT-PLAYBOOK.md` (playbook)
- `~/.hermes/skills/analista-requisitos/SKILL.md` (prompt carregável)
- `cronjob b026cb0403b8` (instância de execução)

### `RF-AGENT-02` — Tom e idioma

**Ator:** Agente (toda comunicação escrita).

**Trigger:** Toda interação (PR, issue, commit message, relatório).

**Regras:**

- **MUST** escrever em **português brasileiro (pt-BR)**.
- **MUST** ser **direto** (sem floreios, hedging).
- **MUST** ser **evidência-first** (arquivo:linha, métrica, link).
- **MUST** respeitar tom definido em `PO-AGENT-PLAYBOOK.md §4`.
- **MUST NOT** usar: "Certamente posso ajudar!", "Vamos explorar juntos!",
  "poderosa ferramenta", "sinergia", "out-of-the-box", "conforme exposto".

## 3. Requisitos Não-Funcionais (RNF)

### `RNF-AVAIL-01` — Disponibilidade do cron

- Job **MUST** rodar todo dia às 00:00 BRT-3, mesmo que PRs anteriores
  não tenham sido revisados.
- Falha de execução (e.g. sem rede) **MUST** reportar erro no chat
  (`cronjob` default behavior).

### `RNF-MAINT-01` — Manutenibilidade da skill

- Skill **MUST** estar em `~/.hermes/skills/analista-requisitos/SKILL.md`.
- Playbook e referência **MUST** estar em `docs/PO-*.md` do repo.
- Atualizações **SHOULD** ser PRs normais (mudança rastreável).

### `RNF-SEC-01` — Segurança do agente

- **MUST** respeitar `.gitleks.toml` (gitleaks).
- **MUST NOT** commitar `.env` ou secrets.
- **MUST** usar `git rebase` (não `git merge`) para evitar merge commits.

### `RNF-PERF-01` — Performance do agente

- **MUST** abrir no máximo **1 PR por execução** (evitar spam).
- **SHOULD** limitar execução a **10 minutos** (timeout do cron).
- **SHOULD** pular execução se `master` não mudou desde último PR
  (otimização P2).

## 4. Traceability (RTM)

| RF            | Descrição           | Materialização                | Teste                                           | Status      |
| ------------- | ------------------- | ----------------------------- | ----------------------------------------------- | ----------- |
| `RF-AGENT-01` | Análise diária + PR | Este PR + cron `b026cb0403b8` | Smoke: primeira execução 2026-07-30 00:00 BRT-3 | 🟡 Proposto |
| `RF-AGENT-02` | Tom e idioma        | `PO-AGENT-PLAYBOOK.md §4`     | Manual (revisão humana)                         | 🟡 Proposto |

## 5. Configuração técnica

### 5.1 Skill

```yaml
name: analista-requisitos
description: 'PO técnico do pedi-ai. Use when o usuário pede análise
  diária, PRs de sugestão, auditoria de produto, ou o cron dispara.'
version: 1.0.0
author: Hermes Agent + b3ll3o
license: MIT
path: ~/.hermes/skills/analista-requisitos/SKILL.md
```

### 5.2 Cron job

```yaml
job_id: b026cb0403b8
name: analista-requisitos-pedi-ai-daily
schedule: '0 3 * * *' # 00:00 BRT-3 diário
delivery: origin # chat atual
attach_to_session: true # interativo
skills: [analista-requisitos]
workdir: /root/pedi-ai
repeat: forever
```

### 5.3 Comando de re-criação (se precisar)

```bash
hermes cronjob create \
  --name "analista-requisitos-pedi-ai-daily" \
  --schedule "0 3 * * *" \
  --skills "analista-requisitos" \
  --workdir "/root/pedi-ai" \
  --deliver "origin" \
  --attach-to-session \
  --prompt @prompts/analista-requisitos.md
```

## 6. Decisões de design

| #   | Decisão                                                   | Razão                                                 | Alternativas                           |
| --- | --------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| D1  | **Prompt externo a `~/.hermes/skills/`** em vez de inline | Skills são reusáveis + versionáveis + compartilháveis | Inline no cron (não-portável)          |
| D2  | **1 PR/execução** em vez de batch                         | Evita PR-monstro; PRs revisáveis                      | Acumular achados (dificulta review)    |
| D3  | **`attach_to_session: true`**                             | Permite follow-up conversacional                      | Background silencioso (perde contexto) |
| D4  | **Skipping automático** se item não-claro                 | Honesto: "nada relevante" > PR fútil                  | Forçar PR (ruim)                       |
| D5  | **OpenSpec spec completa**                                | Projeto é SDD-first                                   | Só doc sem spec (quebra convention)    |
| D6  | **Sem auto-merge**                                        | Manter revisão humana                                 | Auto-merge arriscado                   |
| D7  | **Verificar PR #57 antes**                                | Não duplicar trabalho                                 | Não verificar (ruim)                   |

## 7. Fora de Escopo (especificação)

- **NÃO** substitui PO humano: complementa.
- **NÃO** faz merge.
- **NÃO** cria issues.
- **NÃO** publica em redes sociais.
- **NÃO** modifica código fora do escopo do PR que está abrindo.

## 8. Referências

- `docs/PO-SKILLS.md` — referência completa
- `docs/PO-AGENT-PLAYBOOK.md` — playbook operacional
- `~/.hermes/skills/analista-requisitos/SKILL.md` — skill
- `docs/auditorias/PLANO_AUDITORIA_2026-07-29.md` — auditoria P0/P1/P2 filed
- `.openspec/AGENTS.md` — convenções SDD
- `AGENTS.md` — convenções monorepo
- `docs/COMPANY.md` — OKRs 2026
