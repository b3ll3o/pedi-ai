# Tasks: Adicionar Botão "Sair" na Interface do Cliente

## Phase 1: Foundation
- [x] 1.1 Criar diretório `src/components/customer/`
- [x] 1.2 Criar `src/components/customer/CustomerHeader.tsx` com:
  - Uso de `useAuth()` para verificar `isAuthenticated`
  - Estados: default, hover, loading (spinner + "Saindo..."), erro
  - Botão "Sair" com ícone door-open do Lucide React
  - Redirecionamento para `/login` após signOut
  - `data-testid="customer-logout-button"` para E2E
  - Acessibilidade: `aria-label="Sair da conta"`
- [x] 1.3 Criar `src/components/customer/CustomerHeader.module.css` com:
  - Estilos para header (flex, justify-content: space-between)
  - Estilos para botão em todos os estados (default, hover, disabled/loading)
  - Responsivo (funciona em mobile)

## Phase 2: Core Implementation
- [x] 2.1 Integrar `CustomerHeader` em `MenuPageClient.tsx`:
  - Importar CustomerHeader
  - Adicionar como primeiro elemento dentro do container (antes do header existente)
  - Testar visualmente e via snapshot
- [x] 2.2 Integrar `CustomerHeader` em `CartClient.tsx`:
  - Importar CustomerHeader
  - Posicionar acima do header existente (voltar + título)
  - Verificar que não quebra layout
- [x] 2.3 Integrar `CustomerHeader` em `OrderConfirmationClient.tsx`:
  - Importar CustomerHeader
  - Envolver conteúdo com header + CustomerHeader

## Phase 3: Integration
- [x] 3.1 Modificar `CheckoutClient.tsx` (já possui header):
  - Adicionar botão "Sair" ao header existente
  - Usar `useAuth().signOut()` + redirect para `/login`
  - Manter consistência visual com CustomerHeader
  - Usar `data-testid="customer-logout-button"` para E2E

## Phase 4: Verification
- [x] 4.1 Verificar que `useAuth().signOut()` funciona (linha 183 de `useAuth.ts`)
- [-] 4.2 Executar testes unitários existentes (se houver para useAuth) — SKIPPED: não existem testes unitários para useAuth no projeto
- [x] 4.3 Criar/editar teste E2E `tests/e2e/tests/customer/logout.spec.ts`:
  - Login como cliente
  - Navegar para `/menu`
  - Clicar botão "Sair"
  - Verificar redirecionamento para `/login`
  - Verificar que sessão foi invalidada
- [x] 4.4 Executar `npm run test:e2e` e confirmar que passa

## Dependencies
- `src/hooks/useAuth.ts` - já possui `signOut` implementado (linha 183)
- `src/components/admin/AdminLayout.tsx` - referência para padrão de signOut

## File Summary

| Ação | Arquivo |
|------|---------|
| **NOVO** | `src/components/customer/CustomerHeader.tsx` |
| **NOVO** | `src/components/customer/CustomerHeader.module.css` |
| MODIFICADO | `src/app/(customer)/menu/MenuPageClient.tsx` |
| MODIFICADO | `src/app/(customer)/cart/CartClient.tsx` |
| MODIFICADO | `src/app/(customer)/checkout/CheckoutClient.tsx` |
| MODIFICADO | `src/app/(customer)/order/[orderId]/OrderConfirmationClient.tsx` |
| **NOVO** | `tests/e2e/tests/customer/logout.spec.ts` |
