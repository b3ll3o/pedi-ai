# OpenSpec — Convenções do Projeto Pedi-AI

> Documento normativo para a gestão de requisitos formais do projeto.
> Aplicável a **todas** as mudanças funcionais e não-funcionais do monorepo.

---

## 1. Propósito

Este diretório `.openspec/` é a **fonte da verdade** dos requisitos do Pedi-AI.
Cada **bounded context** (BC) tem uma pasta em `.openspec/specs/<bc>/` com:

- `proposal.md` — **Por que** estamos fazendo isso (motivação, alternativas, riscos).
- `design.md` — **O que** vamos entregar (requisitos, decisões, RTM).
- `tasks.md` — **Como** vamos entregar (passos verificáveis, ordem, critérios de pronto).

Mudanças ativas que ainda não viraram baseline vivem em `.openspec/changes/<id>/`.

---

## 2. Identificadores de Requisitos (RF / RNF / US)

### 2.1 Requisitos Funcionais (RF)

Formato: **`RF-<CTX>-<NN>`**

- `<CTX>` = abreviação do bounded context (3-5 letras, maiúsculas)
- `<NN>` = número sequencial com 2 dígitos, zero-padded

| Contexto        | Sigla   |
| --------------- | ------- |
| `autenticacao/` | `AUTH`  |
| `admin/`        | `ADM`   |
| `cardapio/`     | `MENU`  |
| `mesa/`         | `TABLE` |
| `pedido/`       | `ORDER` |
| `pagamento/`    | `PAY`   |

Exemplos:

- `RF-AUTH-01` — Registrar usuário
- `RF-AUTH-04` — Recuperar senha via e-mail
- `RF-ORDER-12` — Cancelar pedido com reembolso (ver `design.md` do BC `pedido`)

### 2.2 Requisitos Não-Funcionais (RNF)

Formato: **`RNF-<CATEG>-<NN>`**

Categorias (alinhadas à ISO 25010):

| Sigla    | Categoria                |
| -------- | ------------------------ |
| `PERF`   | Eficiência de desempenho |
| `SEC`    | Segurança                |
| `AVAIL`  | Disponibilidade          |
| `MAINT`  | Manutenibilidade         |
| `COMPAT` | Compatibilidade          |
| `USAB`   | Usabilidade              |
| `RELI`   | Confiabilidade           |
| `I18N`   | Localização              |
| `A11Y`   | Acessibilidade           |
| `LGPD`   | Conformidade LGPD        |

Exemplos:

- `RNF-PERF-01` — LCP < 2.5s na landing page
- `RNF-SEC-01` — Senhas armazenadas com bcrypt cost ≥ 10
- `RNF-LGPD-01` — Retenção de pedidos por 24 meses, depois anonimizados

### 2.3 User Stories (US)

Formato: **`US-<NNN>`** (3 dígitos, sem prefixo de BC — vive no backlog)

Toda US **DEVE** referenciar ao menos um `RF-<CTX>-NN` que implementa.

---

## 3. Palavras-Chave (RFC 2119)

Quando usadas em MAIÚSCULAS, as seguintes palavras têm o significado da RFC 2119:

| Palavra         | Significado                                           |
| --------------- | ----------------------------------------------------- |
| **MUST**        | Requisito absoluto. Bloqueia merge.                   |
| **MUST NOT**    | Proibição absoluta. Bloqueia merge.                   |
| **SHOULD**      | Recomendação forte. Exige justificativa para desviar. |
| **SHOULD NOT**  | Desaconselhado. Exige justificativa para usar.        |
| **MAY**         | Opcional. Não bloqueia.                               |
| **REQUIRED**    | Sinônimo de MUST.                                     |
| **RECOMMENDED** | Sinônimo de SHOULD.                                   |

Onde aparecem:

- Em `design.md` das specs
- Em comentários `@spec(...)` no código (vide Seção 6)
- Em `docs/requirements/RNF.md`

---

## 4. Versionamento

- Toda spec baseline em `.openspec/specs/<bc>/` representa o **estado atual aprovado**.
- Mudanças que **alteram comportamento** DEVEM ser propostas via `.openspec/changes/<id>/` antes do PR.
- Mudanças que **apenas corrigem typos / links / metadata** podem ir direto no PR da spec baseline.

Aprovação: PR com **pelo menos** 1 aprovação de mantenedor + CI verde.

---

## 5. Estrutura de Pastas

```
.openspec/
├── AGENTS.md                          # Este arquivo
├── specs/                             # Baselines aprovadas
│   ├── autenticacao/
│   │   ├── proposal.md
│   │   ├── design.md                  # Contém RF-AUTH-NN e RTM
│   │   └── tasks.md
│   ├── admin/
│   ├── cardapio/
│   ├── mesa/
│   ├── pedido/
│   └── pagamento/
└── changes/                           # Mudanças propostas (não-aprovadas)
    └── YYYY-MM-DD-<slug-curto>/
        ├── proposal.md
        ├── design.md
        └── tasks.md
```

---

## 6. Comentários `@spec` no Código

Toda referência a um requisito **MUST** usar o formato `/** @spec(RF-XXX-NN) */`
acima da função, classe ou bloco que **materializa** o requisito.

Exemplo (em `apps/web/src/application/autenticacao/services/AutenticarUsuarioUseCase.ts`):

```typescript
/**
 * Use Case para autenticar usuário.
 * @spec(RF-AUTH-02)
 */
export class AutenticarUsuarioUseCase implements UseCase<...> {
  // ...
}
```

Regras:

- **Uma mesma função pode implementar vários requisitos** (separe por vírgula): `@spec(RF-AUTH-01, RF-AUTH-02)`.
- **Use cases são o ponto primário** de marcação. Entidades e VOs são marcados **apenas** se encapsulam regra de negócio **alinhada diretamente** a um RF.
- O **script `scripts/rtm.ts`** varre o repositório em busca desses comentários para gerar a RTM.

---

## 7. RTM (Requirements Traceability Matrix)

A RTM é gerada por `pnpm rtm` (que executa `tsx scripts/rtm.ts`).

Saída: `docs/requirements/RTM.md` — uma tabela com colunas:

| RF  | Descrição | Use Case / Entidade (código) | Spec | Teste Unitário | Teste E2E | Status |
| --- | --------- | ---------------------------- | ---- | -------------- | --------- | ------ |

`Status` ∈ { `✅ Done`, `🟡 Partial`, `🔴 Missing` }:

- **Done** — código + spec + pelo menos 1 teste unitário E 1 teste E2E exercitam o requisito.
- **Partial** — código existe mas cobertura de teste está incompleta.
- **Missing** — nenhuma referência encontrada.

A RTM **MUST** ser regenerada antes de fechar um PR que toque `.openspec/`.

---

## 8. Backlog e Roadmap

- **Now** (sprint atual): US ativas em `.openspec/changes/`.
- **Next** (próximo quartil): seção `## Próximos Requisitos` no `design.md` de cada BC.
- **Later** (parque de ideias): US marcadas com `status: planned` em `docs/requirements/BACKLOG.md` (a criar).

---

## 9. Auditoria e Conformidade

- `pnpm rtm` **DEVE** rodar em CI e falhar se algum `RF-XXX-NN` declarado em spec não tiver **pelo menos 1** referência `@spec` no código.
- Mudanças em `.openspec/specs/` **DEVEM** atualizar a RTM e commitar `docs/requirements/RTM.md` no mesmo PR.

---

## 10. Glossário

| Termo        | Definição                                       |
| ------------ | ----------------------------------------------- |
| **BC**       | Bounded Context — unidade de modelagem DDD      |
| **RF**       | Requisito Funcional                             |
| **RNF**      | Requisito Não-Funcional                         |
| **US**       | User Story                                      |
| **Spec**     | Especificação formal em `.openspec/specs/<bc>/` |
| **RTM**      | Requirements Traceability Matrix                |
| **Baseline** | Estado aprovado de uma spec                     |
| **Change**   | Proposta de mudança em `.openspec/changes/`     |
