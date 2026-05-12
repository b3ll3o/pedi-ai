# GStack Integration — Pedi-AI

> Inspired by [gstack](https://github.com/garrytan/gstack) - Garry Tan's AI development workflow

Este documento descreve como integrar práticas do gstack no fluxo de desenvolvimento do Pedi-AI.

## Visão Geral

GStack é um conjunto de 23 slash commands que transformam Claude Code em uma "equipe virtual". Para o Pedi-AI, adaptamos as skills mais relevantes:

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `/review` | Code review automatizado | Alta |
| `/qa` | Browser automation para testes | Alta |
| `/ship` | Release automation + coverage audit | Alta |
| `/office-hours` | Refinement de escopo | Média |
| `/investigate` | Debug sistemático | Média |

## Como Usar

### 1. Review (antes de merge)

```bash
# Executar review completo
pnpm gstack:review

# Review apenas de arquivos modificados
pnpm gstack:review --diff
```

### 2. QA (testes de browser)

```bash
# Executar QA completo
pnpm gstack:qa

# QA em staging
pnpm gstack:qa --url=https://staging.pedi.ai
```

### 3. Ship (release)

```bash
# Ship com verification
pnpm gstack:ship

# Ship dry-run
pnpm gstack:ship --dry-run
```

### 4. Office Hours (refinement)

```bash
# Gerar template para refinement
pnpm gstack:office-hours
```

## Configuração

Adicionar ao `package.json`:

```json
{
  "scripts": {
    "gstack:review": "node scripts/gstack/review.js",
    "gstack:qa": "node scripts/gstack/qa.js",
    "gstack:ship": "node scripts/gstack/ship.js",
    "gstack:office-hours": "node scripts/gstack/office-hours.js"
  }
}
```

## Workflow Integrado

```
1. IDÉIA → /office-hours (refinar escopo)
       ↓
2. PLANO → /plan-ceo-review (avaliar escopo)
       ↓
3. IMPLEMENTAÇÃO → (execução)
       ↓
4. REVIEW → /review (code review)
       ↓
5. QA → /qa (browser tests)
       ↓
6. SHIP → /ship (release)
```

## Scripts

Os scripts estão em `scripts/gstack/`:

- `review.js` — Executa code review
- `qa.js` — Browser automation
- `ship.js` — Release automation
- `office-hours.js` — Template de refinement

## Referências

- [GStack GitHub](https://github.com/garrytan/gstack)
- [Slash Commands Documentation](https://github.com/garrytan/gstack/blob/main/docs/skills.md)