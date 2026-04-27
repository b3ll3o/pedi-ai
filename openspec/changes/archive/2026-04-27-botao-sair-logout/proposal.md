# Proposal: Adicionar Botão "Sair" na Interface do Cliente

## Intent

Permitir que o cliente autenticado (usuário logado via `/login` ou `/register`) possa fazer **logout** da sua conta. Atualmente, o sistema já possui:
- `useAuth().signOut()` implementado (linha 183 de `src/hooks/useAuth.ts`)
- Botão "Sair" no painel admin (`AdminLayout.tsx`)

Porém, o **cliente** (rota `(customer)`) não possui mecanismo para sair da conta, forçando-o a limpar dados do navegador ou usar navegação anônima.

## Scope

### In Scope
- Adicionar botão "Sair" na interface do cliente logado
-萎  hook `useAuth()` com `signOut` (já existe)
- Redirecionamento para `/login` após logout
- Feedback visual durante logout (loading state)

### Out of Scope
- Modificações no painel admin (já possui logout)
- Alterações na autenticação (sessões, tokens - já funciona)
- Logout de múltiplos dispositivos simultâneos

## Approach

### Opção A: Criar `CustomerHeader` component (Recomendado)
Criar um componente de header reutilizável para as páginas do cliente `(customer)`:
- Utilizar `useAuth()` para verificar `isAuthenticated` e exibir botão
- Posicionar no topo das páginas: `menu`, `cart`, `checkout`, `order/[orderId]`
- Seguir padrão similar ao `AdminLayout.tsx` que já possui `signOut` implementado

### Opção B: Adicionar no checkout apenas
Simplifica a implementação colocando o botão apenas na página de checkout.

### Componentes afetados
```
src/
├── components/
│   └── customer/
│       └── CustomerHeader.tsx     # Novo componente
├── app/(customer)/
│   ├── menu/MenuPageClient.tsx    # Adicionar header
│   ├── cart/CartClient.tsx        # Adicionar header
│   ├── checkout/CheckoutClient.tsx # Já tem header, adicionar botão
│   └── order/[orderId]/OrderConfirmationClient.tsx # Adicionar header
```

## Design

### Estrutura do CustomerHeader
```tsx
// Comportamento
- Se usuário NÃO logado: não renderiza nada ou mostra "Entrar"
- Se usuário LOGADO: mostra avatar/nome + botão "Sair"
- Ao clicar "Sair":
  1. Mostrar loading (desabilitar botão)
  2. Chamar `signOut()`
  3. Redirecionar para `/login`
```

### Estados do botão
| Estado | Aparência |
|--------|-----------|
| Default | Fundo branco, texto "Sair", ícone door-open |
| Hover | Fundo cinza claro |
| Loading | Spinner + "Saindo..." + disabled |
| Erro | Toast/alert com mensagem de erro |

## Affected Areas

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAuth.ts` | Nenhuma (já possui `signOut`) |
| `src/components/customer/CustomerHeader.tsx` | **NOVO** - componente de header com logout |
| `src/app/(customer)/menu/MenuPageClient.tsx` | Importar e usar `CustomerHeader` |
| `src/app/(customer)/cart/CartClient.tsx` | Importar e usar `CustomerHeader` |
| `src/app/(customer)/checkout/CheckoutClient.tsx` | Adicionar botão "Sair" ao header existente |
| `src/app/(customer)/order/[orderId]/OrderConfirmationClient.tsx` | Importar e usar `CustomerHeader` |

## Risks

1. **Conflito com header existente**: Checkout já tem header próprio - integrar sem duplicar
2. **Inconsistência visual**: Header do admin usa estilos de admin, cliente precisa de design próprio
3. **UX em mobile**: Header deve funcionar bem em todas as resoluções

## Rollback Plan

1. Remover imports de `CustomerHeader` dos arquivos modificados
2. Manter `CustomerHeader.tsx` no filesystem (pode ser útil no futuro)
3. Reverter CSS se criado módulo específico

## Success Criteria

- [ ] Cliente logado consegue ver botão "Sair" na interface
- [ ] Ao clicar "Sair", sessão é invalidada
- [ ] Redirecionamento para `/login` ocorre após logout
- [ ] Não há erros no console após logout
- [ ] Funciona em mobile (touch-friendly, mínimo 44x44px)
- [ ] Teste E2E de logout do cliente passa
