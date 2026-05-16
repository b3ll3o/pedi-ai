# Fluxos do Administrador — Pedi-AI

Documentação completa de todos os fluxos do administrador (gestor do restaurante).

---

## Índice

1. [Fluxo de Autenticação Admin](#1-fluxo-de-autenticação-admin)
2. [Fluxo de Gerenciamento de Restaurantes](#2-fluxo-de-gerenciamento-de-restaurantes)
3. [Fluxo de Gerenciamento de Equipe](#3-fluxo-de-gerenciamento-de-equipe)
4. [Fluxo de Autenticação de Membros da Equipe](#4-fluxo-de-autenticação-de-membros-da-equipe)
5. [Fluxo de Gerenciamento de Categorias](#5-fluxo-de-gerenciamento-de-categorias)
6. [Fluxo de Gerenciamento de Produtos](#6-fluxo-de-gerenciamento-de-produtos)
7. [Fluxo de Gerenciamento de Grupos de Modificadores](#7-fluxo-de-gerenciamento-de-grupos-de-modificadores)
8. [Fluxo de Gerenciamento de Combos](#8-fluxo-de-gerenciamento-de-combos)
9. [Fluxo de Gerenciamento de Mesas e QR Codes](#9-fluxo-de-gerenciamento-de-mesas-e-qr-codes)
10. [Fluxo de Gerenciamento de Pedidos](#10-fluxo-de-gerenciamento-de-pedidos)
11. [Fluxo de Painel da Cozinha](#11-fluxo-de-painel-da-cozinha)
12. [Fluxo de Atualizações em Tempo Real](#12-fluxo-de-atualizações-em-tempo-real)
13. [Fluxo de Dashboard e Analytics](#13-fluxo-de-dashboard-e-analytics)
14. [Fluxo de Seletor de Restaurante](#14-fluxo-de-seletor-de-restaurante)
15. [Fluxo de Recuperação de Senha](#15-fluxo-de-recuperação-de-senha)

---

## 1. Fluxo de Autenticação Admin

### 1.1 Login de Administrador

```
Admin acessa /login (ou /admin/login)
  → Admin informa email e senha
  → Sistema autentica via Supabase Auth
  → Sistema consulta users_profiles para obter role
  → Sistema verifica se role é: owner, manager, ou staff
  → Sistema cria sessão
  → Redireciona para /admin/dashboard
```

**Cenarios:**

- **Sucesso**: Credenciais válidas + role válida → /admin/dashboard
- **Credenciais Inválidas**: Exibe erro "Email ou senha incorretos"
- **Role Inválida** (cliente): Redireciona para /menu (não tem acesso admin)
- **Rota Protegida Sem Auth**: Redireciona para /login preservando URL original

**Arquivos:**

- `apps/web/src/lib/auth/` — Módulo de autenticação
- `apps/web/src/lib/supabase/middleware.ts` — Proteção de rotas admin

**Fluxos E2E:** `apps/web/apps/web/tests/admin/auth.spec.ts`

### 1.2 Logout

```
Admin clica em "Sair"
  → Sistema limpa sessão (Supabase Auth)
  → Redireciona para /login
```

### 1.3 Proteção de Rotas

```
Usuário não autenticado acessa /admin/*
  → Middleware intercepta requisição
  → Redireciona para /login?redirect=/admin/...
  → Após login, redireciona de volta para /admin/...
```

---

## 2. Fluxo de Gerenciamento de Restaurantes

### 2.1 Listar Restaurantes

```
Owner/Manager acessa /admin/restaurants
  → Sistema exibe lista de restaurantes vinculados ao usuário via user_restaurants
  → Cada restaurante exibe: nome, status (ativo/inativo), data de criação
  → Owner com múltiplos restaurantes vê seletor de restaurante ativo
```

**Cenarios:**

- Owner com 1 restaurante: Redireciona direto para o restaurante
- Owner com múltiplos restaurantes: Mostra lista para seleção

**Fluxos E2E:** `apps/web/apps/web/tests/admin/multi-restaurant.spec.ts`

### 2.2 Criar Restaurante

```
Owner acessa /admin/restaurants/new
  → Owner preenche formulário:
    - Nome do restaurante
    - CNPJ
    - Endereço
    - Telefone
  → Owner clica em "Criar Restaurante"
  → Sistema valida CNPJ único
  → Sistema cria registro Restaurante (ativo=true)
  → Sistema cria UsuarioRestaurante (papel='owner')
  → Sistema emite evento RestauranteCriadoEvent
  → Redireciona para /admin/dashboard do novo restaurante
```

### 2.3 Editar Restaurante

```
Owner acessa /admin/restaurants/[id]/edit
  → Owner modifica dados do restaurante
  → Owner clica em "Salvar"
  → Sistema atualiza registro Restaurante
  → Sistema emite evento RestauranteAtualizadoEvent
```

### 2.4 Desativar Restaurante

```
Owner acessa configurações do restaurante
  → Owner clica em "Desativar Restaurante"
  → Sistema confirma ação com dialog
  → Sistema marca Restaurante como inativo (soft delete)
  → Clientes não veem mais o restaurante na lista pública
  → Pedidos existentes são preservados
```

### 2.5 Reativar Restaurante

```
Owner acessa configurações do restaurante desativado
  → Owner clica em "Reativar Restaurante"
  → Sistema marca Restaurante como ativo
  → Restaurante volta a aparecer na lista pública
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/restaurant-reactivate.spec.ts`

---

## 3. Fluxo de Gerenciamento de Equipe

### 3.1 Listar Membros da Equipe

```
Owner/Manager acessa /admin/team ou /admin/settings/team
  → Sistema exibe todos os usuários vinculados ao restaurante via UsuarioRestaurante
  → Cada membro exibe: nome, email, papel, status
  → Cores por papel:
    - owner → #dc2626 (vermelho)
    - manager → #d97706 (âmbar)
    - staff → #2563eb (azul)
```

### 3.2 Convidar Novo Membro

```
Owner/Manager preenche formulário de convite
  → Informa email do novo membro
  → Seleciona papel: manager ou staff
  → Clica em "Convidar"
  → Sistema cria usuário no Supabase Auth (se não existir)
  → Sistema cria UsuarioRestaurante com papel selecionado
  → Sistema envia email de convite
  → Sistema emite evento UsuarioVinculadoRestauranteEvent
```

### 3.3 Alterar Papel de Membro

```
Owner/Manager seleciona membro
  → Altera papel (ex: staff → manager)
  → Sistema atualiza UsuarioRestaurante.papel
  → Sistema emite evento
```

### 3.4 Remover Membro

```
Owner/Manager clica em "Remover" ao lado do membro
  → Sistema exibe confirmação
  → Sistema remove UsuarioRestaurante
  → Sistema emite evento UsuarioDesvinculadoRestauranteEvent
  → Membro perde acesso ao restaurante imediatamente
```

**Cenarios Especiais:**

- **Prevenir Auto-Remoção**: Owner não pode remover a si mesmo
- **Hierarquia de Papéis**: owner > manager > staff
  - Um manager não pode gerenciar owners
  - Um staff só pode ver pedidos

### 3.5 Níveis de Acesso por Papel

| Recurso        | Owner | Manager | Staff           |
| -------------- | ----- | ------- | --------------- |
| Dashboard      | ✅    | ✅      | ✅              |
| Categorias     | ✅    | ✅      | ❌              |
| Produtos       | ✅    | ✅      | ❌              |
| Modificadores  | ✅    | ✅      | ❌              |
| Combos         | ✅    | ✅      | ❌              |
| Mesas/QR Codes | ✅    | ✅      | ❌              |
| Pedidos        | ✅    | ✅      | ✅ (apenas ver) |
| Equipe         | ✅    | ❌      | ❌              |
| Configurações  | ✅    | ❌      | ❌              |
| Analytics      | ✅    | ❌      | ❌              |

---

## 4. Fluxo de Autenticação de Membros da Equipe

### 4.1 Primeiro Login (Após Convite)

```
Membro recebe email de convite
  → Membro acessa link do email
  → Sistema exibe formulário de definição de senha
  → Membro define senha
  → Sistema cria sessão para o membro
  → Redireciona para /admin/dashboard
```

### 4.2 Login de Membro Existente

```
Membro acessa /login
  → Informa email e senha
  → Sistema autentica via Supabase Auth
  → Sistema consulta users_profiles para papel
  → Sistema verifica vínculo com restaurante
  → Redireciona para /admin/dashboard
```

**Cenarios:**

- Membro sem vínculo: Exibe erro "Você não tem acesso a este restaurante"
- Membro desvinculado: Não consegue mais acessar

---

## 5. Fluxo de Gerenciamento de Categorias

### 5.1 Listar Categorias

```
Admin acessa /admin/categories
  → Sistema exibe categorias do restaurante ativo
  → Categorias ordenadas por display_order
  → Exibe: nome, descrição, número de produtos, status (ativa/inativa)
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/categories.spec.ts`

### 5.2 Criar Categoria

```
Admin acessa /admin/categories/new
  → Preenche formulário:
    - Nome da categoria
    - Descrição (opcional)
    - Ordem de exibição
  → Clica em "Criar"
  → Sistema valida dados
  → Sistema cria Categoria com restauranteId
  → Categoria disponível no cardápio do cliente (se ativa)
```

### 5.3 Editar Categoria

```
Admin acessa /admin/categories/[id]/edit
  → Modifica dados
  → Clica em "Salvar"
  → Sistema atualiza Categoria
  → Alterações visíveis no cardápio imediatamente
```

### 5.4 Reordenar Categorias

```
Admin arrasta categorias na lista
  → Sistema atualiza display_order de cada categoria
  → Nova ordem refletida no cardápio do cliente
```

### 5.5 Desativar Categoria

```
Admin clica em "Desativar"
  → Sistema marca Categoria como inativa
  → Produtos da categoria ocultados do cardápio
  → Pedidos existentes preservados
```

### 5.6 Excluir Categoria

```
Admin clica em "Excluir"
  → Sistema confirma exclusão
  → Sistema marca Categoria como inativa (soft delete)
  → Sistema não exclui produtos (apenas desvincula)
```

---

## 6. Fluxo de Gerenciamento de Produtos

### 6.1 Listar Produtos

```
Admin acessa /admin/products
  → Sistema exibe produtos do restaurante
  → Filtros por: categoria, status (ativo/inativo)
  → Exibe: nome, preço, categoria, labels dietéticos, status
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/products.spec.ts`

### 6.2 Criar Produto

```
Admin acessa /admin/products/new
  → Preenche formulário:
    - Nome
    - Descrição
    - Preço
    - Categoria (dropdown)
    - Imagem (upload)
    - Labels dietéticos (checkboxes): vegetariano, vegano, gluten-free, etc.
    - Modificadores (associação)
  → Clica em "Criar"
  → Sistema valida dados
  → Sistema cria ItemCardapio (tipo='produto')
  → Sistema faz upload da imagem para Supabase Storage
  → Produto visível no cardápio
```

### 6.3 Editar Produto

```
Admin acessa /admin/products/[id]/edit
  → Modifica campos desejados
  → Clica em "Salvar"
  → Sistema atualiza ItemCardapio
  → Alterações visíveis no cardápio imediatamente
```

### 6.4 Associar Modificadores ao Produto

```
Admin edita produto
  → Seção "Modificadores"
  → Admin seleciona grupos de modificadores existentes
  → Ou cria novo grupo inline
  → Salva produto
  → Modificadores aparecem na tela do cliente
```

### 6.5 Desativar/Ativar Produto

```
Admin clica em "Desativar"
  → Sistema marca ItemCardapio como inativo
  → Produto oculto do cardápio
  → Pedidos existentes com produto preservados

Admin clica em "Ativar"
  → Produto volta ao cardápio
```

### 6.6 Excluir Produto

```
Admin clica em "Excluir"
  → Sistema confirma exclusão
  → Sistema marca ItemCardapio como inativo
  → Não exclui fisicamente (preserva histórico)
```

---

## 7. Fluxo de Gerenciamento de Grupos de Modificadores

### 7.1 Criar Grupo de Modificadores

```
Admin acessa /admin/products/[id]/modifiers
  → Clica em "Novo Grupo de Modificadores"
  → Preenche:
    - Nome do grupo (ex: "Tamanho", "Adicionais")
    - Obrigatório: sim/não
    - Mín/Máx seleções (se não obrigatório)
  → Clica em "Criar Grupo"
```

### 7.2 Adicionar Valores ao Grupo

```
Admin edita grupo de modificadores
  → Clica em "Adicionar Opção"
  → Preenche:
    - Nome da opção (ex: "Grande", "Leite condensado")
    - Ajuste de preço (+R$ 2,00 ou -R$ 1,00)
  → Clica em "Salvar"
```

### 7.3 Editar/Remover Modificador

```
Admin edita modificador
  → Altera nome ou preço
  → Ou clica em "Remover"
  → Sistema atualiza/remove
```

### 7.4 Validação de Modificador Obrigatório

```
Modificador marcado como required
  → Cliente tenta adicionar produto sem selecionar
  → Sistema exibe erro "Selecione as opções obrigatórias"
  → Produto não é adicionado ao carrinho
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/modifier-groups.spec.ts`

---

## 8. Fluxo de Gerenciamento de Combos

### 8.1 Listar Combos

```
Admin acessa /admin/combos
  → Sistema exibe combos do restaurante
  → Exibe: nome, preço bundle, número de itens, status
```

### 8.2 Criar Combo

```
Admin acessa /admin/combos/new
  → Preenche:
    - Nome do combo
    - Descrição
    - Preço bundle (promocional)
    - Categoria
    - Imagem
  → Seleciona produtos que fazem parte do combo
  → Clica em "Criar"
  → Sistema cria ItemCardapio (tipo='combo')
  → Sistema cria ComboItem para cada produto selecionado
  → Preço bundle exibido no cardápio do cliente
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/combos-admin.spec.ts`

### 8.3 Editar Combo

```
Admin acessa /admin/combos/[id]/edit
  → Modifica dados ou itens do combo
  → Clica em "Salvar"
  → Sistema atualiza combo
```

### 8.4 Definir Preço Bundle

```
Admin edita combo
  → Define "Preço do Combo" (bundle_price)
  → Sistema calcula economia vs. soma dos itens
  → Exibe economia para o cliente (ex: "Economize R$ 10,00")
```

---

## 9. Fluxo de Gerenciamento de Mesas e QR Codes

### 9.1 Listar Mesas

```
Admin acessa /admin/tables
  → Sistema exibe todas as mesas do restaurante
  → Exibe: label, status (ativa/inativa), QR code gerado?, número de pedidos
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/table-qr.spec.ts`

### 9.2 Criar Mesa

```
Admin acessa /admin/tables/new
  → Informa label (ex: "Mesa 1", "Bar 1")
  → Clica em "Criar Mesa"
  → Sistema cria Mesa
  → Sistema gera QR Code automaticamente
  → QR Code包含:
    - restaurant_id
    - table_id
    - assinatura (para prevenir falsificação)
```

### 9.3 Gerar/Regenerar QR Code

```
Admin clica em "Gerar QR Code" na mesa
  → Sistema gera QR code com payload assinado
  → Payload: { restaurantId, tableId, signature }
  → Assinatura usa HMAC-SHA256 com chave secreta
  → QR code baixável como PNG
```

### 9.4 Baixar QR Code

```
Admin clica em "Baixar QR Code"
  → Sistema gera PNG do QR code
  → Browser baixa arquivo: "mesa-{label}-qrcode.png"
  → Admin imprime e coloca na mesa
```

### 9.5 Editar Mesa

```
Admin modifica label da mesa
  → Sistema atualiza
  → Se "Regenerar QR Code" solicitado:
    → Nova assinatura gerada
    → QR Code antigo deixa de funcionar
```

### 9.6 Desativar Mesa

```
Admin clica em "Desativar Mesa"
  → Sistema marca Mesa como inativa
  → QR Code da mesa para de funcionar
  → Clientes escaneando veem mensagem "Mesa indisponível"
  → Pedidos existentes não são afetados
```

---

## 10. Fluxo de Gerenciamento de Pedidos

### 10.1 Listar Pedidos

```
Admin acessa /admin/orders
  → Sistema exibe pedidos do restaurante
  → Filtros:
    - Status (todos, pending, paid, preparing, etc.)
    - Período (hoje, semana, mês, custom)
  → Exibe: número do pedido, mesa, status, total, data
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/orders.spec.ts`

### 10.2 Ver Detalhes do Pedido

```
Admin clica em um pedido
  → Sistema exibe:
    - Número do pedido
    - Mesa
    - Cliente (nome/email ou "Convidado")
    - Itens completos com modificadores
    - Histórico de status com timestamps
    - Informações de pagamento
    - Observações
```

### 10.3 Atualizar Status do Pedido

```
Admin seleciona novo status
  → Sistema valida transição (FSM)
  → Sistema atualiza Pedido
  → Sistema registra em PedidoStatusHistory com:
    - Status anterior
    - Novo status
    - Timestamp
    - Admin que alterou (se applicable)
  → Sistema emite evento realtime

Transições válidas:
  pending → confirmed → preparing → ready → delivered
                 ↘ cancelled
  paid → received → preparing → ready → delivered
```

### 10.4 Aceitar Pedido (Kitchen)

```
Garçom/Gerente recebe notificação de novo pedido
  → Acessa pedido
  → Clica em "Aceitar"
  → Status: paid → received
  → Notificação enviada para cozinha
```

### 10.5 Rejeitar Pedido

```
Garçom/Gerente clica em "Rejeitar"
  → Informa motivo da rejeição
  → Status: paid → rejected
  → Sistema inicia reembolso (se pago)
  → Cliente notificado
```

### 10.6 Marcar como Pronto

```
Cozinha clica em "Pronto"
  → Status: preparing → ready
  → Notificação para garçom
```

### 10.7 Marcar como Entregue

```
Garçom clica em "Entregue"
  → Status: ready → delivered
  → Pedido concluído
```

### 10.8 Cancelar Pedido

```
Admin clica em "Cancelar Pedido"
  → Sistema verifica se cancelamento é permitido
    - Não permite: delivered, cancelled, refunded
  → Sistema confirma cancelamento
  → Se pago via Pix:
    → Sistema inicia reembolso
    → Status: cancelled → refunded
  → Cliente notificado
```

---

## 11. Fluxo de Painel da Cozinha

### 11.1 Exibir Pedidos Pendentes

```
Cozinha acessa /kitchen ou /admin/kitchen
  → Sistema exibe pedidos com status:
    - received
    - preparing
  → Ordenados por tempo de criação (mais antigos primeiro)
  → Cada pedido exibe:
    - Número da mesa
    - Itens do pedido
    - Modificadores
    - Tempo desde criação
    - Indicador de "stale" (> 5 min)
```

**Fluxos E2E:** `apps/web/apps/web/tests/waiter/kitchen.spec.ts`

### 11.2 Receber Notificação de Novo Pedido

```
Sistema detecta novo pedido paid/received
  → Emite notificação sonora
  → Exibe alerta visual
  → Pedido aparece no topo da lista
```

### 11.3 Iniciar Preparo

```
Cozinha clica em "Iniciar Preparo"
  → Status: received → preparing
  → Pedido permanece na lista com indicador
```

### 11.4 Marcar como Pronto

```
Cozinha clica em "Pronto"
  → Status: preparing → ready
  → Pedido é removido da lista da cozinha
  → Notificação para garçom
```

### 11.5 Detecção de Pedido Stale

```
Pedido em received ou preparing há > 5 minutos
  → Sistema marca pedido como "stale"
  → Exibe alerta visual (cor diferenciada)
  → Indica tempo excedido para a cozinha
```

---

## 12. Fluxo de Atualizações em Tempo Real

### 12.1 Supabase Realtime - Admin

```
Admin acessa /admin/orders ou /kitchen
  → Sistema conecta ao canal Realtime do Supabase
  → Assina eventos de INSERT/UPDATE na tabela pedidos
  → Quando pedido é modificado:
    → Cliente recebe atualização instantânea
    → Admin recebe atualização instantânea
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/realtime-updates.spec.ts`

### 12.2 Fallback de Polling

```
Conexão realtime cai
  → Sistema detecta disconnect
  → Sistema inicia polling a cada 10 segundos
  → Exibe indicador de "Conexão perdida - modo polling"
  → Quando reconnecta:
    → Retorna para realtime
    → Exibe "Conexão restaurada"
```

### 12.3 Notificações ao Cliente

```
Status do pedido é alterado
  → Sistema emite evento realtime
  → Cliente na página de acompanhamento vê atualização
  → Notificação visual exibida
```

---

## 13. Fluxo de Dashboard e Analytics

### 13.1 Dashboard Principal

```
Owner/Manager acessa /admin/dashboard
  → Sistema exibe:
    - Total de pedidos hoje/semana/mês
    - Receita total do período
    - Pedidos pendentes em tempo real
    - Gráfico de pedidos por dia
    - Itens mais vendidos (top 10)
```

**Fluxos E2E:** `apps/web/apps/web/tests/admin/analytics.spec.ts`

### 13.2 Visualizar Pedidos por Período

```
Admin acessa analytics
  → Seleciona período: dia, semana, mês, custom
  → Sistema exibe:
    - Número de pedidos
    - Receita total
    - Ticket médio
```

### 13.3 Visualizar Itens Populares

```
Admin acessa seção "Itens Mais Vendidos"
  → Sistema exibe ranking dos 10 produtos mais pedidos
  → Dados do período selecionado
```

### 13.4 Métricas de Desempenho

```
Sistema calcula:
  - Tempo médio de preparo
  - Taxa de cancelamento
  - Taxa de conversão (visitas → pedidos)
```

---

## 14. Fluxo de Seletor de Restaurante

### 14.1 Exibir Seletor (Multi-Restaurante)

```
Owner/Manager com acesso a múltiplos restaurantes
  → Admin UI exibe seletor no header/sidebar
  → Mostra nome do restaurante ativo
  → Dropdown lista outros restaurantes
```

### 14.2 Trocar Restaurante Ativo

```
Admin seleciona restaurante diferente no seletor
  → Sistema atualiza context de restaurante
  → Todas as operações subsequentes scope para novo restaurante
  → URL pode refletir restaurantId
  → Menu management, pedidos, mesas — todos filtrados
```

### 14.3 Isolamento de Dados por Restaurante

```
Admin em Restaurante A
  → Acessa /admin/orders
  → Vê apenas pedidos do Restaurante A
  → Não vê dados do Restaurante B
```

### 14.4 Usuário Sem Acesso a Restaurante

```
Usuário autenticado sem vínculo UsuarioRestaurante
  → Acessa qualquer página admin
  → Sistema redireciona para página "Nenhum restaurante"
  → Mensagem: "Você não tem acesso a nenhum restaurante"
  → Opção de contatar administrador
```

---

## 15. Fluxo de Recuperação de Senha

### 15.1 Solicitar Redefinição

```
Admin na tela de login clica "Esqueci minha senha"
  → Informa email cadastrado
  → Clica em "Enviar link"
  → Sistema envia email de redefinição via Supabase Auth
  → Mensagem: "Verifique seu email para redefinir a senha"
```

### 15.2 Redefinir Senha via Link

```
Admin acessa link no email
  → Sistema valida token
  → Exibe formulário de nova senha
  → Admin define nova senha
  → Sistema atualiza senha no Supabase Auth
  → Sistema invalida sessões anteriores
  → Redireciona para /login
```

---

## Resumo — Hierarquia de Papéis

| Papel   | Nível          | Pode Gerenciar                              |
| ------- | -------------- | ------------------------------------------- |
| owner   | 3 (mais alto)  | Tudo, incluindo outros owners               |
| manager | 2              | staff, categorias, produtos, mesas, pedidos |
| staff   | 1 (mais baixo) | Apenas pedidos (leitura e status)           |

### Funções de Verificação

```typescript
// Localização: apps/web/src/domain/autenticacao/value-objects/Papel.ts
canManageRole(currentRole, targetRole): boolean
getRoleLabel(role): string  // Retorna "Proprietário", "Gerente", "Funcionário"
getRoleColor(role): string  // Retorna cor hex do badge
```

---

## Matriz de Fluxos x Tags E2E

| Fluxo                 | Spec File                                   | Tags              |
| --------------------- | ------------------------------------------- | ----------------- |
| auth (admin)          | `apps/web/apps/web/tests/admin/auth.spec.ts`                  | @smoke, @critical |
| multi-restaurant      | `apps/web/apps/web/tests/admin/multi-restaurant.spec.ts`      | —                 |
| restaurant-reactivate | `apps/web/apps/web/tests/admin/restaurant-reactivate.spec.ts` | —                 |
| categories            | `apps/web/apps/web/tests/admin/categories.spec.ts`            | —                 |
| products              | `apps/web/apps/web/tests/admin/products.spec.ts`              | —                 |
| modifier-groups       | `apps/web/apps/web/tests/admin/modifier-groups.spec.ts`       | —                 |
| combos-admin          | `apps/web/apps/web/tests/admin/combos-admin.spec.ts`          | —                 |
| table-qr              | `apps/web/apps/web/tests/admin/table-qr.spec.ts`              | —                 |
| orders                | `apps/web/apps/web/tests/admin/orders.spec.ts`                | —                 |
| realtime-updates      | `apps/web/apps/web/tests/admin/realtime-updates.spec.ts`      | —                 |
| analytics             | `apps/web/apps/web/tests/admin/analytics.spec.ts`             | —                 |
| kitchen (garçom)      | `apps/web/apps/web/tests/waiter/kitchen.spec.ts`              | @slow             |
| offline-restaurant    | `apps/web/apps/web/tests/admin/offline-restaurant.spec.ts`    | —                 |

---

## Status de Pedidos — Transições Válidas

```
┌─────────────┐     ┌───────────┐     ┌───────────┐     ┌───────┐     ┌───────────┐
│pending_payment│────▶│    paid    │────▶│ received  │────▶│ready  │────▶│ delivered │
└─────────────┘     └───────────┘     └───────────┘     └───────┘     └───────────┘
                           │                │
                           ▼                ▼
                     ┌───────────┐    ┌───────────┐
                     │ cancelled │    │ cancelled │
                     └───────────┘    └───────────┘

                           ┌───────────┐     ┌───────────┐
                     ┌─────│ preparing  │────▶│ cancelled │
                     │     └───────────┘     └───────────┘
                     │
                     └──────────────────────────────────────────────▶ (cancelled de qualquer status)
```

---

## Links

- **Specs**: documentados nos arquivos `codemap.md` de cada domínio
- [Testes E2E](../tests/e2e/)
- [Arquitetura DDD](./codemap.md#domain-codemaps)
- [Guia de Offline](./docs/guides/OFFLINE.md)
- [Guia Realtime](./docs/guides/REALTIME.md)
