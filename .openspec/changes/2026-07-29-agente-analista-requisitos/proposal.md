# Proposal — Agente `analista-requisitos` (PO técnico automatizado)

> **Status:** 🟡 Proposto · **Data:** 2026-07-29 · **Owner:** b3ll3o
> **Mudança:** `#2026-07-29-agente-analista-requisitos`
> **Refs:** `docs/PO-SKILLS.md`, `docs/PO-AGENT-PLAYBOOK.md`, `docs/requirements/RTM.md`

---

## 1. Contexto

O `pedi-ai` está em fase de **validação e lançamento** (vide `docs/COMPANY.md`).
A auditoria técnica de 2026-07-29 (PR #57) consolidou 52 achados (12 P0, 24 P1,
16 P2) e entregou a estabilização P0 parcial. O backlog restante é grande
demais para ser curado manualmente — mesmo um PO dedicado à tempo integral
teria dificuldade de:

- Ler **todos os commits** do `master` diariamente e detectar padrões.
- Cruzar achados com **P0/P1/P2 já filed** (risco de duplicar).
- Aplicar **frameworks de priorização** (RICE, MoSCoW, Kano) consistentemente.
- Manter **conformidade OpenSpec** em cada PR (RF-XXX-NN, RTM, `@spec`).
- Respeitar **conventions do monorepo** (DDD, pt-BR, cobertura ≥80%).
- Acompanhar **sinais de alarme** (LGPD, PIX, multi-tenant, offline-first).

A solução proposta é a criação do **agente `analista-requisitos`** — um PO
técnico automatizado, executado diariamente, que abre PRs de sugestão no
repositório respeitando todos os princípios acima.

## 2. Por que (motivação)

| Problema                                                               | Solução proposta                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Backlog grande + auditoria extensa → risco de duplicar/ignorar achados | Agente que **lê PR #57** antes de sugerir                               |
| Sugestões inconsistentes sem framework de priorização                  | Agente que **aplica RICE/MoSCoW/Kano** e documenta                      |
| Deriva de OpenSpec (RF-XXX-NN sem `@spec`)                             | Agente que **cria/atualiza specs** em `.openspec/changes/`              |
| Tom de comunicação varia entre contribuidores                          | Agente com **pt-BR + tom direto** definido em `PO-AGENT-PLAYBOOK.md §4` |
| PO humano só consegue revisar N PRs/dia                                | Agente roda **1 PR/sessão** em horário fixo (00:00 BRT-3)               |
| Críticas de auditoria se perdem no ruído                               | Agente **classifica** por categoria primária + Cagan risk               |

## 3. Alternativas consideradas

| Alternativa                                             | Por que NÃO                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Revisão manual semanal por PO dedicado                  | Não escala; PO único não cobre 6 BCs + 52 achados             |
| Bot genérico de análise estática (SonarQube, CodeScene) | Não tem visão de produto; só lints de código                  |
| ChatGPT/Claude sem skill customizada                    | Não conhece convenções do `pedi-ai` (DDD, OpenSpec, PIX-only) |
| GitHub Copilot generativo                               | Focado em código, não em roadmap/PR/sugestão                  |

## 4. Escopo (o que está dentro)

- ✅ **Skill `analista-requisitos`** (`~/.hermes/skills/analista-requisitos/`) — prompt-base permanente carregado em cada execução.
- ✅ **Documentação operacional** (`docs/PO-SKILLS.md`, `docs/PO-AGENT-PLAYBOOK.md`) — referência completa e playbook.
- ✅ **Cron job `analista-requisitos-pedi-ai-daily`** — execução diária 00:00 BRT-3, entrega no chat, sessão anexada (interativo).
- ✅ **OpenSpec spec** (este arquivo) — proposal + design + tasks + RF-AGENT-01.
- ✅ **PR demonstrativo** — abertura do primeiro PR de calibração.

## 5. Fora de Escopo

- ❌ **Auto-merge** de PRs — sempre revisão humana.
- ❌ **Multi-repo** — apenas `b3ll3o/pedi-ai` por enquanto.
- ❌ **Slack/Teams** delivery — apenas chat atual (Discord).
- ❌ **ML-based** sugestão de features — baseado em heurística + evidência.
- ❌ **Métricas de aceitação** pós-merge automaticamente (a fazer em P2).

## 6. Riscos & Mitigações

| Risco                                    | Probabilidade | Impacto | Mitigação                                                                                                  |
| ---------------------------------------- | ------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| PRs de baixa qualidade / ruído           | Média         | Média   | Agente **declina** quando não há item de alto impacto (vide prompt §"Quando não encontrar nada relevante") |
| Duplicação com achados já filed (PR #57) | Alta          | Média   | Agente **lê docs/auditorias/PLANO_AUDITORIA_2026-07-29.md** antes de sugerir                               |
| Sobrecarga de PRs no time                | Média         | Alta    | Agente abre **1 PR/dia** (limite natural do cron)                                                          |
| Sugestão viola DDD ou convenções         | Baixa         | Alta    | Skill carrega `AGENTS.md` + `PO-SKILLS.md` antes de agir                                                   |
| Fork de ideias entre PRs do agente       | Baixa         | Média   | Agente verifica `.openspec/changes/` para wip antes de criar                                               |
| Mudança silenciosa de tom/evidência      | Baixa         | Média   | Playbook §4 tem anti-tons explícitos; auditoria mensal de PRs                                              |

## 7. Métricas de Sucesso (90 dias)

| Métrica                             | Baseline (sem agente) | Meta (90d)                            |
| ----------------------------------- | --------------------- | ------------------------------------- |
| PRs de produto/sugestão abertos/sem | 0-1                   | ≥1/dia quando há item de impacto      |
| PRs com RF-XXX-NN linkado           | ~50%                  | 100%                                  |
| PRs com cobertura ≥80% mantida      | n/a                   | 100%                                  |
| PRs rejeitados por duplicidade      | —                     | <10%                                  |
| PRs com tom/language conformes      | —                     | 100% (sem "certamente posso ajudar!") |
| Categorias cobertas (8+1+1+1)       | —                     | ≥8 cobertas em 90d                    |

## 8. Referências

- **Skill:** `~/.hermes/skills/analista-requisitos/SKILL.md` (permanente)
- **Playbook:** `docs/PO-AGENT-PLAYBOOK.md` (operacional)
- **Habilidades:** `docs/PO-SKILLS.md` (referência completa)
- **Auditoria existente:** `docs/auditorias/PLANO_AUDITORIA_2026-07-29.md` (PR #57)
- **OpenSpec:** `.openspec/AGENTS.md`
- **AGENTS.md:** monorepo conventions
- **Cron job:** `cronjob b026cb0403b8` (action='list' para inspeção)
