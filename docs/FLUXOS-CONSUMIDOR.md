# Fluxos do Consumidor — Pedi-AI

Documentação completa de todos os fluxos do consumidor (cliente que faz pedidos).

---

## Índice

1. [Fluxo de Acesso ao Cardápio](#1-fluxo-de-acesso-ao-cardápio)
2. [Fluxo de Autenticação](#2-fluxo-de-autenticação)
3. [Fluxo de Registro](#3-fluxo-de-registro)
4. [Fluxo de Navegação no Cardápio](#4-fluxo-de-navegação-no-cardápio)
5. [Fluxo de Adição ao Carrinho](#5-fluxo-de-adição-ao-carrinho)
6. [Fluxo de Gerenciamento do Carrinho](#6-fluxo-de-gerenciamento-do-carrinho)
7. [Fluxo de Checkout](#7-fluxo-de-checkout)
8. [Fluxo de Pagamento (Pix)](#8-fluxo-de-pagamento-pix)
9. [Fluxo de Acompanhamento do Pedido](#9-fluxo-de-acompanhamento-do-pedido)
10. [Fluxo de Cancelamento](#10-fluxo-de-cancelamento)
11. [Fluxo Offline](#11-fluxo-offline)
12. [Fluxo de Busca de Restaurantes (Delivery)](#12-fluxo-de-busca-de-restaurantes-delivery)
13. [Fluxo de Recuperação de Senha](#13-fluxo-de-recuperação-de-senha)
14. [Fluxo de Reordenação](#14-fluxo-de-reordenação)
15. [Fluxo de Histórico de Pedidos](#15-fluxo-de-histórico-de-pedidos)

---

## 1. Fluxo de Acesso ao Cardápio

### 1.1 Via QR Code (Presencial)

```
Cliente escaneia QR code da mesa
  → Sistema decodifica QR code (restaurant_id, table_id, assinatura)
  → Sistema valida assinatura do QR code
  → Redireciona para /restaurantes/{restaurantId}/cardapio?mesa={tableId}
  → Carrinho é associado à mesa
```

**Cenarios:**

- **Sucesso**: QR code válido → acesso ao cardápio
- **QR Inválido**: Exibe erro "QR Code inválido"
- **Mesa Inativa**: Exibe mensagem "Mesa indisponível"

**Arquivos:**

- `src/lib/qr/validator.ts` — Validação de QR code (HMAC-SHA256)
- `apps/web/src/app/restaurantes/[restaurantId]/cardapio/page.tsx` — Página do cardápio

### 1.2 Via Lista Pública (Delivery)

```
Cliente acessa /restaurantes
  → Lista restaurantes ativos disponíveis
  → Cliente seleciona restaurante
  → Redireciona para /restaurantes/{restaurantId}/cardapio
```

**Cenarios:**

- Restaurante com banner, horário de funcionamento, taxa de entrega
- Filtro por categoria ou busca por nome

**Arquivos:**

- `apps/web/src/app/restaurantes/page.tsx` — Lista pública
- `apps/web/src/components/restaurant/` — Componentes de listagem

---

## 2. Fluxo de Autenticação

### 2.1 Login de Cliente

```
Cliente acessa /login
  → Cliente informa email e senha
  → Sistema autentica via JWT (NestJS Auth)
  → Sistema consulta users_profiles para obter role
  → Sistema cria sessão
  → Redireciona para:
    - /menu (se role = cliente)
    - /admin/dashboard (se role = dono/gerente/atendente)
```

**Cenarios:**

- **Sucesso**: Credenciais válidas → redirecionamento
- **Credenciais Inválidas**: Exibe erro "Email ou senha incorretos"
- **Campos Vazios**: Validação client-side
- **Usuário Já Autenticado**: Redireciona direto para área correspondente

**Fluxos E2E:** `apps/web/tests/customer/auth.spec.ts`

### 2.2 Logout

```
Cliente clica em "Sair"
  → Sistema limpa sessão
  → Redireciona para /login
```

---

## 3. Fluxo de Registro

### 3.1 Registro com Intenção de Pedido

```
Cliente acessa /register
  → Cliente seleciona intenção "Quero fazer pedidos"
  → Cliente preenche email e senha
  → Sistema cria conta via API NestJS
  → Sistema cria users_profiles com role=cliente e intent=fazer_pedidos
  → Redireciona para /login?registered=true&intent=fazer_pedidos
```

**Fluxos E2E:** `apps/web/tests/customer/register.spec.ts`

### 3.2 Registro com Intenção de Gerenciar Restaurante

```
Cliente acessa /register
  → Cliente seleciona intenção "Quero gerenciar meu restaurante"
  → Cliente preenche email e senha
  → Sistema cria conta via API NestJS
  → Sistema cria users_profiles com role=dono e intent=gerenciar_restaurante
  → Redireciona para /login?registered=true&intent=gerenciar_restaurante
```

---

## 4. Fluxo de Navegação no Cardápio

### 4.1 Browsing por Categorias

```
Cliente acessa cardápio
  → Sistema exibe categorias em ordem de exibição (display_order)
  → Cliente seleciona categoria
  → Sistema exibe produtos da categoria
```

**Funcionalidades:**

- Filtro por labels dietéticos (vegetariano, vegano, gluten-free)
- Busca por nome de produto
- Exibição de thumbnail, nome, preço

**Arquivos:**

- `apps/web/src/domain/cardapio/entities/Categoria.ts`
- `apps/web/src/domain/cardapio/entities/ItemCardapio.ts`

**Fluxos E2E:** `apps/web/tests/customer/menu.spec.ts`

### 4.2 Visualização de Detalhes do Produto

```
Cliente seleciona produto
  → Sistema exibe modal/page com:
    - Nome completo, descrição, preço
    - Imagem em alta resolução
    - Labels dietéticos
    - Grupos de modificadores (obrigatórios e opcionais)
```

**Cenarios:**

- Modificador Obrigatório: Exibe erro se não selecionar
- Modificador Opcional: Pode pular ou selecionar

---

## 5. Fluxo de Adição ao Carrinho

### 5.1 Adicionar Produto Simples

```
Cliente visualiza produto
  → Cliente clica em "Adicionar ao Carrinho"
  → Sistema adiciona produto ao carrinho
  → Sistema persiste carrinho no IndexedDB
  → Badge do carrinho é atualizado
```

**Fluxos E2E:** `apps/web/tests/customer/cart.spec.ts`

### 5.2 Adicionar Produto com Modificadores

```
Cliente visualiza produto com modificadores
  → Cliente seleciona modificadores obrigatórios (se houver)
  → Cliente seleciona modificadores opcionais (se desejar)
  → Cliente clica em "Adicionar ao Carrinho"
  → Sistema valida modificadores obrigatórios
    - Se inválido: Exibe erro "Selecione as opções obrigatórias"
    - Se válido: Adiciona ao carrinho
  → Sistema calcula preço final (produto + modificadores)
  → Sistema persiste no IndexedDB
```

### 5.3 Adicionar Combo

```
Cliente visualiza combo
  → Sistema exibe preço bundle (promocional)
  → Cliente seleciona opções customizáveis do combo (se houver)
  → Cliente clica em "Adicionar ao Carrinho"
  → Sistema adiciona combo como item único com bundle price
```

**Fluxos E2E:** `apps/web/tests/customer/combos.spec.ts`

---

## 6. Fluxo de Gerenciamento do Carrinho

### 6.1 Ver Carrinho

```
Cliente acessa /carrinho ou clica no badge
  → Sistema exibe todos os itens:
    - Nome do produto
    - Modificadores selecionados
    - Quantidade
    - Preço unitário
    - Subtotal
  → Sistema exibe:
    - Subtotal
    - Total
    - Botão "Finalizar Pedido"
```

**Arquivos:**

- `apps/web/src/infrastructure/persistence/cartStore.ts`
- `apps/web/src/infrastructure/persistence/pedido/CarrinhoRepository.ts`

### 6.2 Editar Quantidade

```
Cliente ajusta quantidade (+/-)
  → Sistema recalcula subtotal do item
  → Sistema recalcula total do carrinho
  → Sistema persiste atualização no IndexedDB
```

### 6.3 Remover Item

```
Cliente remove item
  → Sistema remove item do carrinho
  → Sistema recalcula total
  → Sistema persiste no IndexedDB
  → Badge é atualizado
```

### 6.4 Limpar Carrinho

```
Cliente clica em "Limpar Carrinho"
  → Sistema remove todos os itens
  → Sistema persiste no IndexedDB
  → Badge é atualizado
```

---

## 7. Fluxo de Checkout

### 7.1 Revisão do Pedido e Dados do Cliente

```
Cliente acessa /checkout
  → Sistema exibe:
    - Lista de itens do carrinho
    - Modificadores selecionados
    - Preços
    - Total
    - Método de pagamento
  → Cliente preenche dados de contato:
    - Nome (obrigatório)
    - Telefone (obrigatório)
    - Email (obrigatório — usado para o pagador PIX)
  → Cliente seleciona método de pagamento (Pix)
  → Cliente clica em "Confirmar Pedido"
```

**Validações:**

- Carrinho não vazio
- Preços consistentes com cardápio atual
- Produtos ainda disponíveis
- Nome, telefone e email preenchidos

**Arquivos:**

- `src/app/(customer)/checkout/page.tsx`
- `src/components/checkout/CheckoutForm.tsx` — coleta `customerName`, `customerPhone`, `customerEmail`

**Fluxos E2E:** `apps/web/tests/customer/checkout.spec.ts`

### 7.2 Criação do Pedido

```
Cliente confirma pedido
  → Sistema cria pedido com status `pending_payment`
  → Sistema associa mesa_id e restaurante_id
  → Sistema registra customer_name, customer_phone e customer_email no pedido
  → Sistema registra todos os itens do carrinho
  → Sistema limpa carrinho no IndexedDB
  → Redireciona para página de pagamento
```

> **Nota:** O `customer_email` é armazenado no pedido e usado como `payer.email` na criação do PIX via Mercado Pago.

---

## 8. Fluxo de Pagamento (Pix)

### 8.1 Iniciar Pagamento Pix

```
Cliente acessa página de pagamento
  → Sistema cria Pix charge via backend (API /api/payments/pix/create)
  → Sistema exibe QR Code Pix
  → Sistema inicia polling para confirmação (a cada 3s)
```

**Timeout:** 60 segundos para pagamento

**Arquivos:**

- `apps/web/src/application/pagamento/services/CriarPixChargeUseCase.ts`
- `apps/web/src/infrastructure/external/PixAdapter.ts`

**Fluxos E2E:** `apps/web/tests/customer/payment.spec.ts`, `apps/web/tests/payment/pix.spec.ts`

### 8.2 Confirmação de Pagamento

```
Sistema recebe webhook do provedor Pix
  → Sistema valida assinatura do webhook
  → Sistema verifica idempotência (não processar duplicatas)
  → Sistema atualiza pagamento para status `confirmed`
  → Sistema atualiza pedido para status `paid`
  → Sistema emite evento realtime para cozinha/garçom
  → Cliente é notificado da confirmação
```

### 8.3 Timeout de Pagamento

```
60 segundos sem confirmação
  → Sistema exibe mensagem "Tempo esgotado"
  → Cliente pode:
    - Tentar novamente (gera novo QR Code)
    - Cancelar pedido
```

### 8.4 Falha de Pagamento

```
Webhook indica falha
  → Sistema atualiza pagamento para status `failed`
  → Sistema atualiza pedido para status `payment_failed`
  → Cliente é notificado
  → Cliente pode tentar novamente
```

---

## 9. Fluxo de Acompanhamento do Pedido

### 9.1 Status em Tempo Real

```
Pedido é confirmado
  → Cliente acessa página de acompanhamento
  → Cliente visualiza status atual do pedido
  → Cliente recebe atualizações via Socket.io

Status do pedido (FSM):
  pending → confirmed → preparing → ready → delivered
                 ↘ cancelled
```

**Fluxo de Status:**

```
pending_payment → paid → received → preparing → ready → delivered
                                    ↘ rejected
```

**Arquivos:**

- `apps/web/src/domain/pedido/entities/Pedido.ts`
- `src/hooks/useRealtimeOrders.ts`

**Fluxos E2E:** `apps/web/tests/customer/order.spec.ts`

### 9.2 Notificações de Status

```
Status é alterado
  → Sistema emite evento realtime
  → Garçom/cozinha recebe notificação
  → Cliente visualiza atualização em tempo real
```

---

## 10. Fluxo de Cancelamento

### 10.1 Cancelamento pelo Cliente

```
Cliente solicita cancelamento
  → Sistema verifica se pedido pode ser cancelado
    - Status permitidos: pending, confirmed, preparing, ready
    - Status não permitidos: delivered, cancelled
  → Se válido:
    → Sistema inicia reembolso (se pago via Pix)
    → Sistema atualiza status para `cancelled`
    → Cliente é notificado
  → Se inválido:
    → Exibe erro "Não é possível cancelar pedido neste status"
```

**Arquivos:**

- `apps/web/src/application/pedido/services/AlterarStatusPedidoUseCase.ts`
- `apps/web/src/application/pagamento/services/IniciarReembolsoUseCase.ts`

### 10.2 Cancelamento pela Cozinha/Garçom

```
Garçom/cozinha rejeita pedido
  → Sistema registra motivo da rejeição
  → Sistema atualiza status para `rejected`
  → Cliente é notificado da rejeição
```

---

## 11. Fluxo Offline

### 11.1 Cache do Cardápio

```
Cliente acessa cardápio online
  → Sistema baixa cardápio (categorias, produtos, modificadores)
  → Sistema armazena no IndexedDB com TTL de 24h
  → Cliente pode navegar offline dentro desse período
```

**Arquivos:**

- `apps/web/src/infrastructure/persistence/cardapio/CardapioSyncService.ts`
- `src/lib/offline/`

**Fluxos E2E:** `apps/web/tests/customer/offline.spec.ts`

### 11.2 Navegação Offline

```
Cliente perde conexão
  → Sistema exibe indicador "Você está offline"
  → Cliente continua navegando pelo cardápio em cache
  → Cliente pode adicionar itens ao carrinho (armazenado no IndexedDB)
```

### 11.3 Pedido Offline

```
Cliente tenta finalizar pedido offline
  → Sistema exibe "Pedido será enviado quando você reconectar"
  → Sistema armazena pedido no IndexedDB com status `pending_sync`
  → Quando reconecta:
    → Service Worker executa background sync
    → Sistema envia pedido ao servidor
    → Sistema atualiza status para `pending_payment`
```

**Retry com Exponential Backoff:**

- Delay: 1s, 2s, 4s (máximo 30s)
- Máximo de tentativas: 3
- Após falhas: Exibe erro ao cliente

**Arquivos:**

- `src/lib/offline/BackgroundSync.ts`
- `src/lib/sw/`

### 11.4 Sincronização Cross-Tab

```
Cliente tem múltiplas abas abertas
  → Alteração de carrinho em uma aba é broadcast para outras
  → Todas as abas mostram mesmo estado do carrinho
  → BroadcastChannel impede eco (timestamp comparison)
```

---

## 12. Fluxo de Busca de Restaurantes (Delivery)

### 12.1 Listagem Pública

```
Cliente acessa /restaurantes
  → Sistema exibe restaurantes ativos com:
    - Nome
    - Banner
    - Descrição
    - Horário de funcionamento
    - Taxa de entrega
  → Cliente pode filtrar por busca
```

### 12.2 Seleção de Restaurante

```
Cliente seleciona restaurante
  → Sistema redireciona para /restaurantes/{restaurantId}/cardapio
  → Sistema não associa mesa (modo delivery)
```

**Arquivos:**

- `src/app/restaurantes/page.tsx`
- `src/components/restaurant/RestaurantCard.tsx`
- `src/components/restaurant/RestaurantSearch.tsx`

**Fluxos E2E:** `apps/web/tests/customer/restaurants.spec.ts`

---

## 13. Fluxo de Recuperação de Senha

### 13.1 Solicitar Redefinição

```
Cliente acessa /login
  → Cliente clica "Esqueci minha senha"
  → Cliente informa email
  → Sistema envia email de redefinição via API NestJS
```

**Fluxos E2E:** `apps/web/tests/auth/password-recovery.spec.ts`

### 13.2 Redefinir Senha

```
Cliente acessa link no email
  → Sistema exibe formulário de nova senha
  → Cliente define nova senha
  → Sistema atualiza senha
  → Sistema invalida sessões anteriores
  → Sistema redireciona para /login
```

---

## 14. Fluxo de Reordenação

### 14.1 Reordenar do Histórico

```
Cliente acessa histórico de pedidos
  → Cliente seleciona pedido anterior
  → Cliente clica em "Reordenar"
  → Sistema adiciona todos os itens ao carrinho
  → Sistema redireciona para página do carrinho
```

**Arquivos:**

- `apps/web/src/application/pedido/services/ObterHistoricoPedidosUseCase.ts`

**Validações:**

- Verifica se produtos ainda estão disponíveis
- Verifica se preços ainda são válidos

---

## 15. Fluxo de Histórico de Pedidos

### 15.1 Listar Pedidos Anteriores

```
Cliente acessa /pedidos
  → Sistema exibe pedidos do cliente (ordenados por data decrescente)
  → Cada pedido exibe:
    - Data do pedido
    - Status
    - Resumo de itens
    - Total
```

### 15.2 Ver Detalhes do Pedido

```
Cliente seleciona pedido
  → Sistema exibe:
    - Itens completos com modificadores
    - Histórico de status com timestamps
    - Informações de pagamento
```

---

## Resumo — Status do Pedido

| Status            | Descrição                  |
| ----------------- | -------------------------- |
| `pending_payment` | Aguardando pagamento       |
| `paid`            | Pagamento confirmado       |
| `received`        | Recebido pela cozinha      |
| `preparing`       | Em preparo                 |
| `ready`           | Pronto para entrega        |
| `delivered`       | Entregue                   |
| `rejected`        | Rejeitado pelo restaurante |
| `cancelled`       | Cancelado                  |
| `refunded`        | Reembolsado                |

---

## Matriz de Fluxos x Tags E2E

| Fluxo                  | Spec File                                                                       | Tags              |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------- |
| auth (cliente)         | `apps/web/tests/customer/auth.spec.ts`                                          | @smoke, @critical |
| register               | `apps/web/tests/customer/register.spec.ts`                                      | @smoke            |
| menu                   | `apps/web/tests/customer/menu.spec.ts`                                          | —                 |
| cart                   | `apps/web/tests/customer/cart.spec.ts`                                          | —                 |
| checkout               | `apps/web/tests/customer/checkout.spec.ts`                                      | @smoke, @slow     |
| order                  | `apps/web/tests/customer/order.spec.ts`                                         | @slow             |
| payment (Pix)          | `apps/web/tests/customer/payment.spec.ts`, `apps/web/tests/payment/pix.spec.ts` | @slow             |
| offline                | `apps/web/tests/customer/offline.spec.ts`                                       | —                 |
| combos (cliente)       | `apps/web/tests/customer/combos.spec.ts`                                        | —                 |
| modifier-groups        | `apps/web/tests/customer/modifier-groups.spec.ts`                               | —                 |
| password-recovery      | `apps/web/tests/auth/password-recovery.spec.ts`                                 | —                 |
| restaurants (delivery) | `apps/web/tests/customer/restaurants.spec.ts`                                   | —                 |

---

## Links

- **Specs**: documentados nos arquivos `codemap.md` de cada domínio
- [Testes E2E](../tests/e2e/)
- [Arquitetura DDD](./codemap.md#domain-codemaps)
- [Guia Offline](./docs/guides/OFFLINE.md)
