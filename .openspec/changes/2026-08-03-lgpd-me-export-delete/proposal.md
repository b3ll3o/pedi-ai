# Endpoints LGPD `/users/me/export` e `DELETE /users/me` (RF-AUTH-12)

> **Status:** Proposta · **Data:** 2026-08-03 · **PR:** pendente

## 1. Contexto

A auditoria completa de 2026-07-29 (`docs/auditorias/DEVSECOPS-AUDIT-2026-06-25.md` §P1-3)
identificou **ausência de endpoints LGPD art. 18** no monorepo. O `users.controller.ts`
hoje expõe apenas `GET /users/me`, `PATCH /users/me` e `GET /users/me/profiles` —
**nenhum** dos direitos de **acesso** (art. 18, V) ou **eliminação** (art. 18, VI)
está materializado em endpoint.

A LGPD (Lei 13.709/2018) art. 18, V e VI dá ao titular o direito de:

- **V — acesso**: obter confirmação da existência de tratamento e cópia de
  todos os dados pessoais sob custódia do controlador.
- **VI — eliminação**: exigir a eliminação de dados pessoais desnecessários,
  excessivos ou tratados em desconformidade.

O art. 52 prevê **multa de até 2% do faturamento** (limitada a R$ 50M por
infração) por incidente. Para o Pedi-AI operar com clientes PJ (restaurantes),
a conformidade é **pré-requisito de venda** — não dá para fechar contrato
enterprise sem DPO responder a um pedido de export/eliminação.

A **estrutura existe**: `UsersProfile` é o "data subject", os relacionamentos
estão no Prisma (`Order`, `PaymentIntent`, `RefreshToken`, `PasswordResetToken`),
o JWT identifica o titular via `req.user.id`. Falta apenas **a fiação**.

## 2. Por que não foi feito antes

O backlog pré-lançamento tratou LGPD apenas como páginas estáticas
(`/termos`, `/privacidade`) — mergeadas em `96826d7`. Faltou a parte
**operacional**: titular exercendo direitos via API.

## 3. O que esta PR faz

1. **`UsersService.exportUserData(userId)`**: retorna JSON com perfil,
   pedidos (com itens), intenções de pagamento, refresh tokens ativos
   (sem hash), password reset tokens (sem token raw), subscriptions.
2. **`UsersService.anonymizeOwnAccount(userId)`**:
   - Substitui `email` por `anon-<userId>@deleted.local`
   - Substitui `name` por `"Usuário Removido"`
   - Remove `passwordHash`
   - Marca `revokedAt = now()` em todos os `RefreshToken` ativos
   - Marca `used = true` e `expiresAt = now()` em `PasswordResetToken` abertos
   - **NÃO deleta** Orders/Payments (obrigação fiscal art. 27 LGPD/Receita
     Federal — retenção 5 anos)
3. **`UsersController.exportMe`** + **`UsersController.deleteMe`** — endpoints
   novos com `JWT-auth` (sem `@Roles`, qualquer usuário autenticado pode
   exercer direito sobre **si mesmo**).
4. **Rate limiting** — `DELETE /users/me` é operação destrutiva, marcada
   com `@Throttle({ default: { limit: 3, ttl: 3_600_000 } })` (3 por hora).
5. **Testes** — 6 cenários cobrindo: export retorna tudo; export falha para
   user inexistente; delete anonimiza email/nome; delete revoga refresh
   tokens; delete preserva orders (auditoria fiscal); delete idempotente.
6. **Spec OpenSpec**: cria `RF-AUTH-12` (Export) e `RF-AUTH-13` (Delete) em
   `.openspec/specs/autenticacao/design.md` + RTM.

## 4. Categorias

- **Primária:** `lgpd`
- **Secundária:** nenhuma (single-category, MUST conforme PO-AGENT-PLAYBOOK)

## 5. Risco de Cagan

- **value**: alto — pré-requisito de venda enterprise
- **usability**: alto — interface trivial (1 GET, 1 DELETE)
- **feasibility**: muito alta — schema e JWT já existem
- **business-viability**: crítico — sem isso não há venda B2B

## 6. Framework de priorização — RICE

- **Reach**: 100% dos titulares de dados (todos os clientes finais)
- **Impact**: 3 (massive) — destrava venda enterprise + evita multa
- **Confidence**: 4 (high) — schema conhecido, sem ambiguidade legal
- **Effort**: 1.5 (dias) — service + 2 endpoints + testes + spec

**RICE** = (100 × 3 × 4) / 1.5 = **800**

## 7. Critérios de aceite verificáveis

- [ ] `GET /users/me/export` retorna JSON com todos os dados do user autenticado
- [ ] `GET /users/me/export` retorna 401 sem JWT
- [ ] `GET /users/me/export` retorna apenas dados do próprio user (sem
      `userId` no path/query — sempre do JWT)
- [ ] `DELETE /users/me` anonimiza `email`/`name`/`passwordHash` do perfil
- [ ] `DELETE /users/me` revoga TODOS os `RefreshToken` ativos do user
- [ ] `DELETE /users/me` **NÃO deleta** Orders/Payments/PaymentIntents
      (preserva trilha fiscal)
- [ ] `DELETE /users/me` é idempotente (segunda chamada retorna 200, não 404)
- [ ] `DELETE /users/me` tem rate limit 3/h por IP
- [ ] Cobertura ≥85% em `users.service.ts` e `lgpd.service.ts`
- [ ] Cobertura geral api ≥80% (threshold CI)
- [ ] `pnpm --filter @pedi-ai/api lint` → 0 erros
- [ ] RTM regenerada referencia `RF-AUTH-12` e `RF-AUTH-13`

## 8. Métrica de sucesso pós-merge

- **Adoção**: ≥1 chamada real de `/users/me/export` em produção dentro de
  30 dias (DPO respondendo a pedido de titular).
- **Qualidade**: 0 falsos positivos em anonimização — auditoria抽样 mostra
  que Orders pós-delete continuam referenciando o userId antigo via FK
  `customerId` (sem PII vazado em logs/relatórios).

## 9. Riscos e mitigações

| Risco                                                        | Mitigação                                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Auditoria fiscal quebrar ao anonimizar `customerId` de Order | Não anonimizamos `customerId` — só campos PII do perfil (email/nome). Order continua com FK válido.              |
| Hard-delete de RefreshToken revoga sessões de admin          | RefreshToken é revogação (`revokedAt`), não delete. Auditável.                                                   |
| Race condition entre export e delete concorrente             | `anonymizeOwnAccount` roda em `$transaction` com `SELECT FOR UPDATE` implícito (Serializable default do Prisma). |
| LGPD exige **resposta em até 15 dias** (art. 18, §5º)        | Endpoint síncrono — resposta em <500ms (P95). Adequado a SLA.                                                    |

## 10. Não-objetivos (out of scope)

- Endpoint admin para exportar/anonimizar **outro** user (DPO-only) — outra PR
- Soft delete de Orders (somente perfil é anonimizado)
- Direito de **portabilidade** (art. 18, V, "cópia em formato estruturado") —
  o JSON entregue já satisfaz isso para o escopo atual. PDF/CSV pode ser PR futura.
- Notificação ao restaurante quando cliente se auto-deleta (futuro)

## 11. Ligações

- **Auditoria origem:** `docs/auditorias/DEVSECOPS-AUDIT-2026-06-25.md` §P1-3
- **Spec destino:** `.openspec/specs/autenticacao/design.md` (RF-AUTH-12, RF-AUTH-13)
- **RNF relacionado:** `RNF-LGPD-01` (anonimização), `RNF-LGPD-02` (retenção fiscal)
- **PR #57** (auditoria completa — aberto)
