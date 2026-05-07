# Plano de Atualização de Documentação

> Plano para manter documentação e specs atualizados

## 1. Auditoria do Estado Atual

### 1.1 Documentação Existente

| Categoria | Qtd | Status |
|-----------|-----|--------|
| Specs (openspec/specs/) | 14 domínios | ⚠️ Necessita revisão |
| Guias técnicos (docs/guides/) | 8 guias | ✅ OK |
| Guias de setup (docs/setup/) | 3 guias | ✅ OK |
| Docs arquivados | ~20+ | 📦 Archive |
| codemap.md | 2 (raiz + app/) | ⚠️ Parcial |

### 1.2 Gaps Identificados

| Gap | Prioridade | Impacto |
|-----|-----------|---------|
| codemap.md desatualizado pós-DDD | Alta | Confusão na estrutura |
| AGENTS.md com regras DDD já implementadas | Alta | Manter consistência |
| Spec de payment desatualizado (era Mercado Pago, agora Stripe) | Alta | Implementação incorreta |
| Falta spec para: DDD migration, stores, hooks | Média | Documentação incompleta |
| Falta guia para: Debugging, Performance, Error Handling | Média | DX reduzida |
| Docs de tests E2E desatualizados | Média | Manutenção difícil |

---

## 2. Plano de Ação

### Fase 1: Auditoria e Consolidação (1 dia)

#### 2.1.1 Auditar Specs

```
Tarefas:
□ Ler cada spec em openspec/specs/
□ Verificar se implementação está alinhada
□ Marcar specs desatualizados
□ Listar gaps de cobertura
```

**Specs a auditar:**

| Spec | Implementado? | Alinhado? | Status |
|------|--------------|-----------|--------|
| menu | ✅ | ⚠️ | Revisar |
| cart | ✅ | ⚠️ | Revisar |
| order | ✅ | ✅ | OK |
| payment | ⚠️ | ❌ | Desatualizado |
| auth | ✅ | ⚠️ | Revisar |
| admin | ✅ | ⚠️ | Revisar |
| table | ✅ | ✅ | OK |
| offline | ✅ | ✅ | OK |
| landing | ✅ | ✅ | OK |
| seo | ✅ | ✅ | OK |
| combos | ⚠️ | ⚠️ | Parcial |
| modifier-groups | ✅ | ✅ | OK |
| register | ✅ | ⚠️ | Revisar |
| design-system | ✅ | ✅ | OK |

#### 2.1.2 Auditar Docs

```
Tarefas:
□ Verificar se guias refletem código atual
□ Atualizar prints/screenshots
□ Corrigir links quebrados
□ Adicionar missing guides
```

### Fase 2: Atualização de Specs Críticos (2 dias)

#### 2.2.1 Payment Spec

```markdown
## Atualizações necessárias:

1. Remover referência a Mercado Pago
2. Documentar Stripe como provider principal
3. Documentar fluxo Pix (QR Code gerado服务端)
4. Atualizar webhooks (pix_confirmed → payment_confirmed)
5. Adicionar modo demo/sandbox
```

#### 2.2.2 Order Spec

```markdown
## Verificar:

1. Status transitions estão corretas?
   RECEIVED → CONFIRMED → PREPARING → READY → DELIVERED
2. Eventos de domínio documentados?
3. Offline flow documentado?
```

#### 2.2.3 Auth Spec

```markdown
## Atualizar:

1. Roles: admin → owner/manager/staff
2. Multi-tenant: como funciona isolamente?
3. RLS policies: estão documentadas?
```

### Fase 3: Atualização de Docs (2 dias)

#### 2.3.1 Guia de Arquitetura

```markdown
## Atualizar com:

1. Estrutura DDD atual:
   - domain/ (entities, value-objects, aggregates, events, services, repositories)
   - application/ (use cases)
   - infrastructure/ (persistence, external, repositories)
   - presentation/ (Next.js pages, components, hooks)

2. Regras de dependência (domain não pode importar de outras camadas)

3. Status da migração DDD
```

#### 2.3.2 Novo Guia: Error Handling

```markdown
## Criar docs/guides/ERROR_HANDLING.md

Tópicos:
- Error boundaries React
- Handling de erros em services
- Error responses em API routes
- Logging (descrever ferramenta atual)
-监控 (monitoramento)
```

#### 2.3.3 Novo Guia: Debugging

```markdown
## Criar docs/guides/DEBUGGING.md

Tópicos:
- Como debugar offline (Dexie)
- Como debugar realtime
- Como debugar payments (Stripe webhookinspector)
- Logs do Service Worker
```

### Fase 4: Codemap Atualizado (1 dia)

#### 2.4.1 Atualizar codemap.md raiz

```markdown
## Estrutura:

1. Tech stack atualizado (Next.js 16, React 19)
2. Status DDD (implementado, em progresso)
3. Fluxos principais
4. OpenSpec (specs + changes)
```

#### 2.4.2 Criar codemaps por domínio

```
src/domain/cardapio/codemap.md
src/domain/pedido/codemap.md
src/domain/mesa/codemap.md
```

---

## 3. Processo de Manutenção Contínua

### 3.1 Regra de Ouro

> **Nenhuma mudança de código pode ser commitada sem atualizar a documentação relevante.**

### 3.2 Checklist de PR

```markdown
## PR Checklist:

- [ ] Spec atualizado (se aplicável)?
- [ ] Docs atualizados (se aplicável)?
- [ ] codemap.md atualizado (se estrutura mudou)?
- [ ] Tests documentados?
- [ ] README.md do feature atualizado?
```

### 3.3 Frequência de Updates

| Tipo | Quando Atualizar |
|------|-----------------|
| Spec | Quando funcionalidade mudar |
| Guia técnico | Quando ferramenta/processo mudar |
| Codemap | Após cada PR que mudar estrutura |
| README | Mensal ou após feature grande |
| Índice | Quando adicionar/remover docs |

---

## 4. Templates

### 4.1 Template: Spec Update

```markdown
# Spec Update: [Nome do Domínio]

**Data:** YYYY-MM-DD
**Autor:** [Nome]

## Mudanças desde última revisão

-

## Implementação atual vs Spec

| Feature | Spec diz | Implementação | Alinhado? |
|---------|----------|---------------|-----------|
| ...     | ...      | ...           | ✅/❌     |

## Ações necessárias

- [ ]

## Notes
```

### 4.2 Template: Doc Update

```markdown
# Doc Update: [Nome do Guia]

**Data:** YYYY-MM-DD
**Autor:** [Nome]

## Verificações

- [ ] Screenshots ainda válidos?
- [ ] Comandos ainda funcionam?
- [ ] Links internos funcionais?
- [ ] Exemplos de código compilam?

## Updates necessários

-

## Notes
```

---

## 5. Timeline Proposto

```
Semana 1:
├── Dia 1: Auditoria de todos os specs
├── Dia 2: Atualizar specs críticos (payment, order, auth)
├── Dia 3: Atualizar docs de arquitetura + guides
├── Dia 4: Atualizar codemaps
└── Dia 5: Revisão final + índice

Semana 2:
├── Atualizar docs de testes E2E
├── Criar guias missing (debugging, error handling)
├── Treinar equipe (se houver)
└── Estabelecer processo de manutenção
```

---

## 6. Métricas de Sucesso

| Métrica | Target |
|---------|--------|
| Specs alinhados com implementação | 100% |
| Docs com screenshots válidos | 100% |
| Links internos funcionais | 100% |
| Tempo para novo dev configurar | < 2h |
| Cobertura de documentação por domínio | 100% |

---

## 7. Responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| Dev que implementa | Atualiza spec + docs |
| CTO (Tech Lead) | Review de docs críticos e especificação |
| CTO (Tech Lead) | Aprova changes de docs |
| CEO | Define prioridades e cria issues |

---

*Criado: 2026-05-04*
*Revisão: Semanal*
