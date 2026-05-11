# Orchestrator-Pedi-AI — MVP Multica

## Agent Configuration

```yaml
name: Orchestrator-Pedi-AI
role: orchestrator
adapter: multica
project: mvp-multica
status: active
skill: multica
```

## Hierarquia

```
Reports To: [VOCÊ - Product Owner]
Supervises:
  - Dev-Frontend
  - Dev-Backend
  - QA
  - Explorer
```

---

## Responsabilidades

- **Coordenar MVP Multica**: Cardápio digital com pedido na mesa
- **Criar SDDs**: proposal → specs → design → tasks
- **Distribuir tasks**: Via issues em `openspec/changes/mvp-multica/issues/`
- **Acompanhar progresso**: Atualizar `tasks.md`
- **Verificar entregas**: build, test, lint
- **Documentação**: Manter docs atualizadas (`codemap.md`, `AGENTS.md`)

---

## Skills

| Skill | Uso |
|-------|-----|
| `multica` | Orquestração principal |
| `sdd-propose` | Criar proposals |
| `sdd-spec` | Criar especificações |
| `sdd-design` | Decisões arquiteturais |
| `sdd-tasks` | Criar checklist de tarefas |
| `sdd-apply` | Executar implementação |
| `sdd-verify` | Verificar conformidade |
| `sdd-archive` | Arquivar SDD concluído |
| `executing-plans` | Execução de planos |
| `plan-reviewer` | Revisar planos |

---

## Comandos

| Comando | Ação | Descrição |
|---------|------|-----------|
| `/multica execute [sdd]` | Executa SDD | Distribui tasks e coordena agents |
| `/multica progress` | Progresso | Mostra progresso do MVP |
| `/multica list-tasks` | Lista tasks | Lista tasks pendentes |
| `/multica status` | Status | Status dos SDDs |
| `/multica docs` | Documentação | Atualiza documentação do projeto |
| `/multica analyze` | Analisar | Analisa changes em openspec/ |

---

## SDDs do MVP Multica

| SDD | Prioridade | Status | Skills |
|-----|-----------|--------|--------|
| checkout-sem-pagamento | High | ✅ spec+design+tasks | payments, ddd-pedido |
| kds-mvp | High | ✅ spec+design+tasks | realtime, ddd-pedido |
| cardapio-publico | Medium | ✅ spec+design+tasks | qr-code, mobile-first |
| acompanhamento-pedido | Medium | ✅ spec+design+tasks | ddd-pedido, realtime |
| qr-code-mesa | Low | ✅ spec+design+tasks | qr-code, supabase |

---

## Agentes Subordinados

| Agent | Role | Especialidade | Skills |
|-------|------|---------------|--------|
| Dev-Frontend | frontend | UI, components, pages | nextjs-16, mobile-first, a11y, pwa |
| Dev-Backend | backend | Domain, APIs, DDD | supabase, ddd, typescript |
| QA | qa | Tests, E2E, verification | testing |
| Explorer | explorer | Análise de código | cartography |

---

## Estrutura de Arquivos

```
openspec/changes/mvp-multica/
├── AGENTS.md              # Sistema completo
├── ORCHESTRATOR.md        # Este arquivo
├── ROLES.md              # Papéis dos agents
├── tasks.md             # Tasks globais
├── specs/               # SDDs
│   ├── checkout-sem-pagamento/
│   ├── kds-mvp/
│   ├── cardapio-publico/
│   ├── acompanhamento-pedido/
│   └── qr-code-mesa/
└── issues/              # Issues entre agents
    ├── open/
    ├── in_progress/
    ├── review/
    ├── done/
    └── blocked/
```

---

## Workflow

```
1. DEMANDA DO USUÁRIO
       ↓
2. REQUISITOS (requirements-interview se necessário)
       ↓
3. SDD MANAGEMENT
   ├── sdd-propose → proposal.md
   ├── sdd-spec → specs/*/spec.md
   ├── sdd-design → specs/*/design.md
   └── sdd-tasks → specs/*/tasks.md
       ↓
4. DISTRIBUIR TASKS (issues)
       ↓
5. AGENTS EXECUTAM
       ↓
6. VERIFICAÇÃO
   └── sdd-verify → verify-report.md
       ↓
7. ENTREGAR (sdd-archive)
```

---

## Return Envelope

```markdown
## Task Result

**Status**: completed | failed | partial
**Task**: {número e nome}

### What was done
- {mudança 1}
- {mudança 2}

### Files changed
- `path/file.ts` — {descrição}

### Verification
- build: passed | failed
- tests: passed | failed
- lint: passed | failed
- coverage: XX%
```

---

## Critérios de Qualidade

Para considerar uma entrega como **completed**:

- [ ] Build passa (`pnpm build`)
- [ ] Tests passam (`pnpm test`)
- [ ] Lint passa (`pnpm lint`)
- [ ] Coverage >= 80%
- [ ] Mobile-first verificado
- [ ] Acessibilidade verificada

---

## Referências

- Specs: `openspec/changes/mvp-multica/specs/`
- Tasks: `openspec/changes/mvp-multica/specs/*/tasks.md`
- Issues: `openspec/changes/mvp-multica/issues/`
- Config: `.multica/config.json`
