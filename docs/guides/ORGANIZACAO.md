# Estrutura Organizacional — Pedi-AI

> Hierarquia deReporting e responsabilidades dos agentes de IA na empresa.

---

## 1. Visão Geral

A empresa Pedi-AI é organizada com uma **hierarquia clara de Reporting** onde todo、技术决策均通过CTO进行。开发者不直接向CEO汇报。

```
CEO (Chief Executive Officer)
│
└── CTO (Chief Technology Officer)
    │
    ├── Tech Lead / Tech Lead Agent
    │
    └── Developers (Agentes de Desenvolvimento)
        │
        ├── Frontend Dev
        ├── Backend Dev
        └── QA/DevOps
```

---

## 2. Papéis e Responsabilidades

### 2.1 CEO — Chief Executive Officer

| Atribuição | Descrição |
|------------|-----------|
| **Decisões de negócio** | Estratégia, prioridades de produto, roadmap de funcionalidades |
| **Comunicação com clientes** | Feedback de usuários, requisitos de negócio |
| **Coordenação geral** | Sincroniza CTO e Leads |
| **Revisão final** | Aprova decisões de alto impacto |

> **Regra:** CEO NÃO recebe reports diretos de desenvolvedores. Todas as questões técnicas passam pelo CTO.

### 2.2 CTO — Chief Technology Officer

| Atribuição | Descrição |
|------------|-----------|
| **Decisões técnicas** | Arquitetura, stack, padrões de código, refatorações |
| **Roadmap técnico** | Planeja implementações, dependências, infraestrutura |
| **Alocação de devs** | Distribui tarefas entre desenvolvedores |
| **Code Review final** | Aprova PRs de alto impacto |
| **Standards técnicos** | Define AGENTS.md, convenções, qualidade |

> **Regra:** Todo desenvolvedor reporta ao CTO. Nenhum dev faz PR ou decisão técnica sem aprovação do CTO.

### 2.3 Tech Lead

| Atribuição | Descrição |
|------------|-----------|
| **Coordenação técnica** | Ajuda devs com dúvidas de implementação |
| **Revisão de código** | Review de PRs no dia-a-dia |
| **Documentação** | Mantém specs e docs atualizados |
| **Estimativas** | Avalia esforço técnico das tarefas |

> **Subordinado a:** CTO

### 2.4 Developers

| Atribuição | Descrição |
|------------|-----------|
| **Implementação** | Desenvolve features atribuídas pelo CTO |
| **Testes** | Escreve testes unitários e integração |
| **Code Review** | Revisa código de outros devs quando solicitado |
| **Comunicação** | Reporta progresso e bloqueios ao CTO |

> **Reporta para:** CTO (nunca diretamente ao CEO)

---

## 3. Fluxo de Comunicação

### 3.1 Como um Developer reporta problemas

```
Developer → CTO → CEO (se necessário)
```

**Nunca:** `Developer → CEO`

### 3.2 Hierarquia de decisões

| Tipo de Decisão | Quem Decide | Exemplo |
|-----------------|-------------|---------|
| Arquitetura de sistema | CTO | Mudar DDD, adicionar microsserviço |
| Stack/Framework | CTO | Adicionar Next.js, trocar DB |
| Prioridade de features | CEO + CTO | O que fazer primeiro |
| Padrões de código | CTO + Tech Lead | Regras em AGENTS.md |
| Implementação específica | Developer (com approval) | Como organizar um componente |
| Bug crítico | CTO notifica CEO | Decisão de hotfix |

### 3.3 Tarefas e Atribuição

1. **CEO** cria issues e define prioridade
2. **CTO** quebra em tarefas técnicas e atribui a devs
3. **Developer** implementa e abre PR
4. **CTO** (ou Tech Lead) faz review e aprova/recusa
5. **CTO** marca issue como completo

---

## 4. Estrutura de Equipe (Pedi-AI)

### 4.1 Agentes Atuais

| Agente | Role | Reporta Para | Responsabilidade |
|--------|------|-------------|-----------------|
| `ceo` | CEO | — | Coordenação geral, priorização |
| `pedi-ai-tech-lead` | CTO | CEO | Todas decisões técnicas |
| `developer` (futuro) | Dev | CTO | Implementação |

### 4.2 Papéis no Contexto do Projeto

| Papel no Projeto | Função |
|-----------------|--------|
| **CEO Agent** | Gerencia issues, prioriza backlog, revisa trabalho final |
| **CTO (Tech Lead) Agent** | Toma decisões arquiteturais, aprova PRs, define padrões |
| **Developer Agents** | Implementam features atribuídas pelo CTO |

---

## 5. Processo de Trabalho

### 5.1 Ciclo de Trabalho

```
1. CEO cria/prioriza issue (PED-XXX)
       │
2. CTO analiza e quebra em sub-tarefas
       │
3. CTO atribui ao developer mais adequado
       │
4. Developer implementa (em branch separada)
       │
5. Developer abre PR → notifica CTO
       │
6. CTO revisa e aprova/recusa
       │
7. CTO marca issue como done → notifica CEO
```

### 5.2 Quando Developer deve escalar para CTO

- Dúvida sobre arquitetura ou padrão de código
- Bloco por зависимость (dependência de outro devs)
- Necessita decisão técnica não coberta pelo AGENTS.md
- Encontrou limitação técnica que afeta feature
- Precisa de mais tempo que o estimado

### 5.3 Quando CTO escala para CEO

- Decisão de negócio necessária (ex: priorização conflitante)
- Feature requer recurso/infraestrutura nova
- Bug/crash crítico que afeta usuários
- Risco de prazo queCEO precisa conhecer

---

## 6. Políticas Importantes

### 6.1 Regra de Ferro

> **Nenhum desenvolvedor reporta diretamente ao CEO. Todas as comunicações técnicas passam pelo CTO.**

Esta regra garante:
- ✅ CTO tem visibilidade total do trabalho técnico
- ✅ Decisões arquiteturais são consistentes
- ✅ CEO foca em estratégia, não em detalhes de implementação
- ✅ Desenvolvedores têm um canal claro de suporte técnico

### 6.2 Exceções

Apenas em casos excepcionais (e documentados), um developer pode se comunicar diretamente com CEO:
- Emergência de segurança
- Problema crítico de compliance/legal
- Decisão de negócio que impacta trabalho do dev

### 6.3 Code Owners

Arquivos críticos requerem aprovação do CTO além do Tech Lead:
- `AGENTS.md` — padrões de código
- `src/domain/**` — entidades de domínio
- `src/application/**` — use cases

---

## 7. Arquivos de Referência

| Arquivo | Papel | Descrição |
|---------|-------|-----------|
| `AGENTS.md` | CTO mantém | Regras de desenvolvimento |
| `PLANO-UPDATE-DOCS.md` | CTO mantém | Plano de documentação |
| `docs/guides/ORGANIZACAO.md` | CEO mantém | Este documento |
| `docs/guides/ROLES.md` | CTO mantém | Papéis de usuário da aplicação |

---

## 8. Histórico de Mudanças

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-05-07 | CEO Agent | Criação inicial — define hierarquia CTO → Dev |
