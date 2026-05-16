# Guia de Sistema de Assinaturas — Pedi-AI

Este documento descreve o sistema de assinaturas implementado no Pedi-AI, incluindo trial gratuito, planos pagos e comportamento de bloqueio.

---

## 1. Visão Geral

O Pedi-AI utiliza um sistema de assinaturas para controlar o acesso de restaurantes à plataforma:

| Plano      | Preço        | Período  | Status          |
| ---------- | ------------ | -------- | --------------- |
| **Trial**  | Gratuito     | 14 dias  | ✅ Implementado |
| **Mensal** | R$ 19,99/mês | 30 dias  | ✅ Implementado |
| **Anual**  | R$ 19,99/mês | 365 dias | ✅ Implementado |

> **Nota:** O sistema de assinaturas está integrado à plataforma. Operações de escrita são bloqueadas quando a assinatura expira.

---

## 2. Ciclo de Vida da Assinatura

### 2.1 Diagrama de Estados

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────┐    criar()     ┌─────────────┐                 │
│  │   (new)    │ ───────────▶  │    TRIAL    │                 │
│  └─────────────┘               └──────┬──────┘                 │
│                                        │                        │
│                         trial expira    │    ativarAssinatura()  │
│                              ou        ▼                        │
│                         ┌────────────────────────┐              │
│                         │       EXPIRED         │              │
│                         │   (pode reativar)     │              │
│                         └────────────────────────┘              │
│                                        ▲                        │
│                                        │                        │
│                         ┌──────────────┴─────────────┐          │
│                         │         ACTIVE            │          │
│                         │   (assinatura válida)      │          │
│                         └───────────────────────────┘          │
│                                        │                        │
│                         ┌──────────────┴──────────────┐         │
│                         │        CANCELLED           │         │
│                         │  (acesso até fim do prazo) │         │
│                         └────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Status da Assinatura

| Status      | Descrição                                                    |
| ----------- | ------------------------------------------------------------ |
| `trial`     | Período experimental de 14 dias, acesso completo             |
| `active`    | Assinatura paga ativa, acesso completo                       |
| `expired`   | Trial ou assinatura expirou, operações bloqueadas            |
| `cancelled` | Assinatura cancelada pelo usuário, acesso até fim do período |

---

## 3. Entidade de Domínio

### 3.1 Assinatura Entity

**Arquivo:** `src/domain/admin/entities/Assinatura.ts`

```typescript
export type StatusAssinatura = 'trial' | 'active' | 'expired' | 'cancelled';
export type TipoPlano = 'monthly' | 'yearly';

export interface AssinaturaProps {
  id: string;
  restauranteId: string;
  status: StatusAssinatura;
  tipoPlano: TipoPlano;
  preçoCentavos: number;
  moeda: string;
  trialIniciadoEm: Date;
  trialExpiraEm: Date;
  trialDias: number;
  assinaturaIniciadaEm: Date | null;
  assinaturaExpiraEm: Date | null;
  canceladaEm: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
  versão: number;
}
```

### 3.2 Propriedades Calculadas

| Propriedade          | Descrição                                        |
| -------------------- | ------------------------------------------------ |
| `trialAtivo`         | `true` se status é 'trial' e ainda não expirou   |
| `assinaturaAtiva`    | `true` se status é 'active' e não expirou        |
| `períodoAtivo`       | `true` se trial OU assinatura estão ativos       |
| `diasRestantesTrial` | Dias restantes no trial (0 se não está em trial) |
| `bloqueado`          | `true` se período não está ativo                 |
| `preçoFormatado`     | Preço formatado em reais (ex: "R$ 19,99")        |

### 3.3 Métodos de Domínio

| Método                        | Descrição                                  |
| ----------------------------- | ------------------------------------------ |
| `iniciarTrial(dias?)`         | Inicia trial de 14 dias (padrão)           |
| `ativarAssinatura(tipoPlano)` | Ativa assinatura mensal ou anual           |
| `expirar()`                   | Marca trial como expirado                  |
| `cancelar()`                  | Cancela assinatura (mantém acesso até fim) |

---

## 4. Use Cases

### 4.1 GerenciarAssinaturaUseCase

**Arquivo:** `src/application/admin/services/GerenciarAssinaturaUseCase.ts`

#### Verificar Acesso

```typescript
verificarAcesso(input: { restauranteId }): Promise<{
  ativo: boolean;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  diasRestantes: number;
  bloqueado: boolean;
}>
```

#### Iniciar Trial

```typescript
iniciarTrial(input: { restauranteId, diasTrial?: number }): Promise<Assinatura>
// Padrão: 14 dias de trial gratuito
```

#### Ativar Assinatura

```typescript
ativarAssinatura(input: { restauranteId, tipoPlano: 'monthly' | 'yearly' }): Promise<Assinatura>
// Preço: R$ 19,99/mês (2000 centavos)
```

#### Validar Operação

```typescript
validarOperacao(restauranteId: string): Promise<void>
// Lança erro se assinatura expirou
```

---

## 5. API Routes

### 5.1 GET /api/admin/subscriptions

Retorna informações da assinatura do restaurante logado.

**Response:**

```json
{
  "status": "trial",
  "trialDaysRemaining": 14,
  "trialStartedAt": "2026-05-11T00:00:00Z",
  "trialExpiresAt": "2026-05-25T00:00:00Z",
  "planType": null,
  "subscriptionStartedAt": null,
  "subscriptionExpiresAt": null
}
```

### 5.2 POST /api/admin/subscriptions/trial

Cria assinatura trial para o restaurante.

**Request:**

```json
{
  "restaurantId": "rest_xxx",
  "trialDays": 14
}
```

### 5.3 POST /api/admin/subscriptions/activate

Ativa assinatura paga.

**Request:**

```json
{
  "restaurantId": "rest_xxx",
  "planType": "monthly"
}
```

---

## 6. Comportamento de Bloqueio

### 6.1 O que é bloqueado

Quando a assinatura está expirada (`bloqueado: true`):

- ❌ Criar/atualizar produtos do cardápio
- ❌ Criar/atualizar categorias
- ❌ Criar/atualizar mesas
- ❌ Criar novos pedidos (checkout)
- ❌ Qualquer operação de escrita

### 6.2 O que continua funcionando

- ✅ Visualização do cardápio
- ✅ Listagem de pedidos existentes
- ✅ Acesso ao dashboard
- ✅ Operações de leitura

### 6.3 Implementação

O bloqueio é implementado via `validarOperacao()` no `GerenciarAssinaturaUseCase`:

```typescript
async validarOperacao(restauranteId: string): Promise<void> {
  const acesso = await this.verificarAcesso({ restauranteId });
  if (acesso.bloqueado) {
    throw new Error(
      `Operação bloqueada: sua assinatura expirou. Assine o plano R$19.99/mês para continuar.`
    );
  }
}
```

---

## 7. Tabelas do Banco

### 7.1 subscriptions

| Campo                     | Tipo        | Descrição                                 |
| ------------------------- | ----------- | ----------------------------------------- |
| `id`                      | uuid        | Identificador único                       |
| `restaurant_id`           | uuid        | FK para restaurante                       |
| `status`                  | text        | 'trial', 'active', 'expired', 'cancelled' |
| `plan_type`               | text        | 'monthly' ou 'yearly'                     |
| `price_cents`             | integer     | Preço em centavos (1999 = R$19,99)        |
| `currency`                | text        | 'BRL'                                     |
| `trial_started_at`        | timestamptz | Início do trial                           |
| `trial_ends_at`           | timestamptz | Fim do trial                              |
| `trial_days`              | integer     | Dias de trial (14)                        |
| `subscription_started_at` | timestamptz | Início da assinatura                      |
| `subscription_ends_at`    | timestamptz | Fim da assinatura                         |
| `cancelled_at`            | timestamptz | Data do cancelamento                      |
| `created_at`              | timestamptz | Data de criação                           |
| `updated_at`              | timestamptz | Data de atualização                       |

---

## 8. Estrutura de Arquivos

```
apps/web/src/
├── domain/admin/
│   └── entities/
│       └── Assinatura.ts              # Entidade de assinatura
│
├── application/admin/services/
│   └── GerenciarAssinaturaUseCase.ts  # Use cases de assinatura
│
├── infrastructure/persistence/admin/
│   └── AssinaturaRepository.ts        # Implementação do repositório
│
└── app/api/admin/subscriptions/
    └── route.ts                       # API routes de assinatura
```

---

## 9. Variáveis de Ambiente

Não há variáveis de ambiente específicas para assinaturas. O sistema utiliza:

- `SUPABASE_URL` — URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Chave de serviço para operações administrativas

---

## 10. Testes

### 10.1 Testes Unitários

```bash
# Testes da entidade Assinatura
npm run test -- tests/unit/domain/admin/

# Testes do use case
npm run test -- tests/unit/application/admin/
```

### 10.2 Testes de Integração

```bash
# Testes da API de assinaturas
npm run test -- tests/integration/api/subscriptions.test.ts
```
