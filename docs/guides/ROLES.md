# Sistema de Funções e Permissões — Pedi-AI

## 1. Visão Geral

O Pedi-AI implementa um sistema de **Controle de Acesso Baseado em Funções (RBAC — Role-Based Access Control)** para garantir que cada usuário acesse apenas os recursos autorizados. O sistema é **multi-tenant**, permitindo que um mesmo usuário tenha acesso a múltiplos restaurantes com funções potencialmente diferentes em cada um.

O controle de acesso é aplicado em duas camadas:

- **Camada de Aplicação (presentation)**: Validações em componentes, páginas e API routes
- **Camada de Banco de Dados (infrastructure)**: **Row Level Security (RLS)** do Supabase para isolamento obrigatório de dados entre restaurantes

---

## 2. Hierarquia de Funções

O sistema possui quatro funções (roles) organizadas em hierarquia:

| Função    | Português     | Nível          | Descrição                          |
| --------- | ------------- | -------------- | ---------------------------------- |
| `owner`   | **dono**      | 1 (mais alto)  | Acesso completo ao restaurante     |
| `manager` | **gerente**   | 2              | Gerencia cardápio, pedidos e mesas |
| `staff`   | **atendente** | 3              | Vê pedidos e atualiza status       |
| `client`  | **cliente**   | 4 (mais baixo) | Cliente final que faz pedidos      |

### 2.1 Dono (`owner` / `dono`)

- **Acesso**: Completo e irrestrito ao restaurante
- **Permissões**:
  - Criar, editar e excluir o restaurante
  - Gerenciar usuários (adicionar, remover, alterar função)
  - Gerenciar todas as demais entidades (cardápio, mesas, pedidos)
  - Acessar relatórios e dados do restaurante
  - Reativar restaurante desativado

### 2.2 Gerente (`manager` / `gerente`)

- **Acesso**: Operacional completo, exceto gestão de usuários
- **Permissões**:
  - Gerenciar categorias do cardápio
  - Gerenciar produtos e combos
  - Gerenciar grupos de modificadores e valores
  - Gerenciar mesas
  - Visualizar pedidos
  - Atualizar status de pedidos
  - Cancelar pedidos
  - Ver histórico de status de pedidos

### 2.3 Atendente (`staff` / `atendente`)

- **Acesso**: Operacional básico para atendimento
- **Permissões**:
  - Visualizar pedidos do restaurante
  - Atualizar status de pedidos (ex: "em preparo", "pronto", "entregue")
  - Criar pedidos manuais (para pedidos via telefone)
  - Ver cardápio (leitura)

### 2.4 Cliente (`client` / `cliente`)

- **Acesso**: Apenas para fazer pedidos
- **Permissões**:
  - Visualizar cardápio público
  - Fazer pedidos para sua mesa
  - Visualizar seus próprios pedidos

---

## 3. Permissões Detalhadas por Função

### 3.1 Tabela de Permissões

| Recurso           | Operação         | Dono | Gerente | Atendente | Cliente |
| ----------------- | ---------------- | ---- | ------- | --------- | ------- |
| **Restaurante**   | Criar            | ✅   | ❌      | ❌        | ❌      |
|                   | Ler              | ✅   | ✅      | ❌        | ❌      |
|                   | Editar           | ✅   | ❌      | ❌        | ❌      |
|                   | Excluir          | ✅   | ❌      | ❌        | ❌      |
|                   | Reativar         | ✅   | ❌      | ❌        | ❌      |
| **Usuários**      | Criar            | ✅   | ❌      | ❌        | ❌      |
|                   | Ler (lista)      | ✅   | ❌      | ❌        | ❌      |
|                   | Ler (próprio)    | ✅   | ✅      | ✅        | ✅      |
|                   | Editar função    | ✅   | ❌      | ❌        | ❌      |
|                   | Editar próprio   | ✅   | ✅      | ✅        | ❌      |
|                   | Excluir          | ✅   | ❌      | ❌        | ❌      |
| **Categorias**    | Criar            | ✅   | ✅      | ❌        | ❌      |
|                   | Ler              | ✅   | ✅      | ✅        | ❌      |
|                   | Editar           | ✅   | ✅      | ❌        | ❌      |
|                   | Excluir          | ✅   | ✅      | ❌        | ❌      |
| **Produtos**      | Criar            | ✅   | ✅      | ❌        | ❌      |
|                   | Ler              | ✅   | ✅      | ✅        | ✅      |
|                   | Editar           | ✅   | ✅      | ❌        | ❌      |
|                   | Excluir          | ✅   | ✅      | ❌        | ❌      |
| **Combos**        | Criar            | ✅   | ✅      | ❌        | ❌      |
|                   | Ler              | ✅   | ✅      | ✅        | ✅      |
|                   | Editar           | ✅   | ✅      | ❌        | ❌      |
|                   | Excluir          | ✅   | ✅      | ❌        | ❌      |
| **Modificadores** | Criar            | ✅   | ✅      | ❌        | ❌      |
|                   | Ler              | ✅   | ✅      | ✅        | ✅      |
|                   | Editar           | ✅   | ✅      | ❌        | ❌      |
|                   | Excluir          | ✅   | ✅      | ❌        | ❌      |
| **Mesas**         | Criar            | ✅   | ✅      | ❌        | ❌      |
|                   | Ler              | ✅   | ✅      | ✅        | ✅      |
|                   | Editar           | ✅   | ✅      | ❌        | ❌      |
|                   | Excluir          | ✅   | ✅      | ❌        | ❌      |
| **Pedidos**       | Criar (mesa)     | ✅   | ✅      | ✅        | ✅      |
|                   | Criar (manual)   | ✅   | ✅      | ✅        | ❌      |
|                   | Ler (restaurant) | ✅   | ✅      | ✅        | ❌      |
|                   | Ler (próprio)    | ✅   | ✅      | ✅        | ✅      |
|                   | Editar status    | ✅   | ✅      | ✅        | ❌      |
|                   | Cancelar         | ✅   | ✅      | ✅        | ❌      |
|                   | Excluir          | ✅   | ✅      | ✅        | ❌      |

---

## 4. Relacionamento Usuário-Restaurante (Multi-Tenant)

### 4.1 Arquitetura

O Pedi-AI suporta que um mesmo usuário tenha acesso a **múltiplos restaurantes**. Isso é implementado através de:

1. **Tabela `users_profiles`**: Mantém o perfil do usuário com função em cada restaurante
2. **Tabela `user_restaurants`**: Tabela de junção (junction table) para relacionamento N:N

```
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│   auth.users    │       │  users_profiles      │       │  restaurants    │
│─────────────────│       │──────────────────────│       │─────────────────│
│ id (UUID)       │──────<│ user_id (UUID)       │──────<│ id (UUID)       │
│ email           │       │ restaurant_id (UUID) │       │ nome            │
│ created_at      │       │ role (ENUM)         │       │ ...             │
└─────────────────┘       │ name, email         │       └─────────────────┘
                          └──────────────────────┘

                                      ┌──────────────────────┐
                                      │  user_restaurants   │ (N:N junction)
                                      │──────────────────────│
                                      │ id (UUID) PK        │
                                      │ user_id (UUID) FK   │──────> auth.users
                                      │ restaurant_id (UUID)│──────> restaurants
                                      │ role (VARCHAR)      │
                                      │ created_at          │
                                      └──────────────────────┘
```

### 4.2 Modelo de Dados

**Tabela `users_profiles`** (legado, ainda em uso):

```sql
CREATE TABLE users_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'staff',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabela `user_restaurants`** (nova tabela de junção):

```sql
CREATE TABLE user_restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'staff', -- owner, manager, staff
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);
```

### 4.3 Exemplo de Cenário

Um usuário pode ser:

- **Dono** do Restaurante A
- **Gerente** do Restaurante B
- **Atendente** do Restaurante C

Cada restaurante mantém sua própria atribuição de função para o usuário.

---

## 5. Row Level Security (RLS)

### 5.1 Como o RLS Funciona

O Supabase RLS aplica políticas de acesso **linha por linha** em todas as operações do banco. Para implementar isolamento multi-tenant, o Pedi-AI utiliza a sessão do usuário para definir o `restaurant_id` contexto:

```sql
-- Exemplo: Política para ler pedidos
CREATE POLICY "Staff can read restaurant orders"
  ON orders FOR SELECT
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );
```

O `current_setting('app.current_restaurant_id')` é definido **na aplicação** antes de cada requisição, tipicamente através de um trigger ou middleware que define o contexto com base no restaurante selecionado pelo usuário.

### 5.2 Políticas Implementadas

#### Restaurants

- **SELECT**: Usuários belonging ao restaurante
- **UPDATE/DELETE**: Apenas `dono`

#### Categories

- **SELECT**: Qualquer usuário autenticado do restaurante
- **INSERT**: Qualquer usuário autenticado do restaurante
- **UPDATE/DELETE**: `dono` ou `gerente`

#### Products

- **SELECT**: Qualquer usuário do restaurante
- **INSERT/UPDATE/DELETE**: `dono` ou `gerente`

#### Orders

- **SELECT**: Funcionários leem todos do restaurante; clientes leem apenas os próprios
- **INSERT**: Clientes criam para sua mesa; staff cria manualmente
- **UPDATE/DELETE**: Apenas staff do restaurante

#### Users_profiles

- **SELECT**: Próprio usuário OU `dono` do restaurante
- **UPDATE**: Próprio usuário OU `dono` do restaurante

### 5.3 Restaurante Atual (Contexto)

O restaurante atual é definido através da variável de sessão `app.current_restaurant_id`. A aplicação define esta variável quando o usuário seleciona um restaurante para trabajar, permitindo que as políticas RLS filtrem automaticamente os dados corretos.

---

## 6. Fluxo de Autenticação

### 6.1 Autenticação por Função

#### 6.1.1 Fluxo Admin (Painel de Gestão)

```
Usuário abre /admin/login
    │
    ├─> Insere email + senha
    │
    ├─> Supabase valida credenciais
    │
    ├─> Busca perfil em users_profiles
    │
    ├─> Verifica role: dono, gerente ou atendente
    │
    └─> Redireciona para /admin/dashboard
        (acesso permitido apenas com role admin: dono|gerente|atendente)
```

#### 6.1.2 Fluxo Cliente (App de Pedidos)

```
Usuário abre /login (ou /menu)
    │
    ├─> Insere email + senha
    │
    ├─> Supabase valida credenciais
    │
    ├─> Busca perfil em users_profiles
    │
    ├─> Verifica role: cliente
    │
    └─> Redireciona para /menu
        (acesso ao cardápio e pedidos)
```

### 6.2 Endpoints de Autenticação

| Função   | Arquivo                             | Descrição                 |
| -------- | ----------------------------------- | ------------------------- |
| Cadastro | `apps/web/src/lib/supabase/auth.ts` | `signUp(email, password)` |
| Login    | `apps/web/src/lib/supabase/auth.ts` | `signIn(email, password)` |
| Logout   | `apps/web/src/lib/supabase/auth.ts` | `signOut()`               |
| Sessão   | `apps/web/src/lib/supabase/auth.ts` | `getSession()`            |
| Usuário  | `apps/web/src/lib/supabase/auth.ts` | `getUser()`               |
| Recovery | `apps/web/src/lib/supabase/auth.ts` | `resetPassword(email)`    |

### 6.3 Middleware de Autenticação

O arquivo `apps/web/src/lib/supabase/middleware.ts` cria o cliente Supabase para Server Components e API Routes:

```typescript
export async function createClient(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          /* ... */
        },
      },
    }
  );
  return { supabase, supabaseResponse };
}
```

---

## 7. Admin vs Cliente — Fluxos Distintos

### 7.1 Comparação

| Aspecto                | Admin (Painel)                 | Cliente (App)           |
| ---------------------- | ------------------------------ | ----------------------- |
| **URL de login**       | `/admin/login`                 | `/login`                |
| **Dashboard**          | `/admin/dashboard`             | `/menu`                 |
| **Funções permitidas** | `dono`, `gerente`, `atendente` | `cliente`               |
| **Cardápio**           | Edição completa                | Somente leitura         |
| **Pedidos**            | Gerenciamento total            | Criar para própria mesa |
| ** Sessão**            | Persistente (cookie)           | Persistente (cookie)    |

### 7.2 Redirecionamento Baseado em Perfil

Quando um usuário faz login:

1. **Admin** (dono/gerente/atendente) acessando `/login` → Redireciona para `/menu` (fluxo cliente, pois não tem acesso ao cardápio de admin)
2. **Cliente** acessando `/admin/login` → Redireciona para `/menu` (cliente não pode acessar painel admin)

### 7.3 Proteção de Rotas

**Rotas Admin** (`/admin/*`):

- Verificam se há sessão ativa
- Verificam se o usuário tem role de admin (`dono`, `gerente`, `atendente`)
- Redirecionam para `/admin/login` se não autenticado

**Rotas Cliente** (`/menu`, `/login`):

- Cardápio é público (qualquer um pode ver)
- Fazer pedidos requer autenticação de `cliente`
- Rotas protegidas redirecionam para `/login`

---

## 8. Store de Restaurante (Zustand)

O estado do restaurante selecionado é gerenciado em `apps/web/src/infrastructure/persistence/restaurantStore.ts`:

```typescript
interface RestaurantState {
  restauranteSelecionado: RestauranteProps | null;
  restaurantesAcessiveis: RestauranteProps[];
  isLoading: boolean;
  error: string | null;
}

interface RestaurantActions {
  setRestaurante: (restaurante: Restaurante) => void;
  limparSelecao: () => void;
  verificarAcesso: (usuarioId: string, restauranteId: string) => Promise<boolean>;
  carregarRestaurantes: (usuarioId: string) => Promise<void>;
}
```

Este store:

1. Persiste o restaurante selecionado em `localStorage` (chave: `pedi-ai-restaurant`)
2. Permite carregar restaurantes acessíveis ao usuário
3. Verifica se o usuário tem acesso a um restaurante específico

---

## 9. Migração e Histórico

### 9.1 Evolução do Sistema de Funções

| Migration                                | Data             | Alteração                                                             |
| ---------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| `0012_create_users_profiles.sql`         | Inicial          | Cria tabela com roles em inglês (`owner`, `manager`, `staff`)         |
| `0018_create_user_restaurants.sql`       | Multi-restaurant | Adiciona tabela de junção N:N                                         |
| `0020_enable_multi_restaurant_users.sql` | Multi-restaurant | Remove constraint único de user_id                                    |
| `0021_rename_roles_to_ptbr.sql`          | Brazilianização  | Renomeia roles para pt-BR (`dono`, `gerente`, `atendente`, `cliente`) |

### 9.2 Tipo ENUM Atual

```sql
CREATE TYPE user_role AS ENUM ('dono', 'gerente', 'atendente', 'cliente');
```

---

## 10. Boas Práticas

1. **Sempre verificar role no frontend E no backend**: O RLS é a camada final de segurança, mas validações no frontend melhoram UX
2. **Definir `app.current_restaurant_id`**: Antes de qualquer query, certifique-se de que o contexto do restaurante está definido
3. **Manter roles atualizados**: Quando um usuário muda de função, atualizar tanto `users_profiles` quanto `user_restaurants`
4. **Testar fluxos de acesso**: Utilizar os testes E2E em `apps/web/tests/admin/auth.spec.ts` e `apps/web/tests/customer/auth.spec.ts`
5. **Não confiar apenas em UI**: Permissões baseadas em UI podem ser burladas — RLS é obrigatório

---

## 11. Arquivos de Referência

| Arquivo                                                      | Descrição                     |
| ------------------------------------------------------------ | ----------------------------- |
| `apps/web/src/lib/supabase/auth.ts`                          | Funções de autenticação       |
| `apps/web/src/lib/supabase/middleware.ts`                    | Middleware Supabase           |
| `apps/web/src/infrastructure/persistence/restaurantStore.ts` | Store Zustand de restaurantes |
| `apps/web/tests/admin/auth.spec.ts`                         | Testes E2E de auth admin      |
| `apps/web/tests/customer/auth.spec.ts`                      | Testes E2E de auth cliente    |
