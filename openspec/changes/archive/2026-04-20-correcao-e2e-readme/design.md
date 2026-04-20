# Design: Correção README E2E

## Technical Approach

Correção de documentação simples - apenas edição do arquivo `tests/e2e/README.md`.

## Architecture Decisions

### Decision: Manter todas as outras seções do README inalteradas
**Choice**: Apenas as linhas específicas são modificadas
**Alternatives considered**: Reescrever documento completo
**Rationale**: Mudança mínima e focada reduz risco de introduzir novos erros

## File Changes

| Arquivo | Mudança |
|---------|---------|
| `tests/e2e/README.md` | Corrigir 3 seções específicas |

## Seções a Corrigir

1. **Seção "Fluxos Sem Cobertura"**: Remover entradas de recuperação de senha
2. **Seção "Page Objects"**: A contagem real é 11 (CustomerLoginPage, MenuPage, CartPage, CheckoutPage, OrderPage, AdminLoginPage, AdminDashboardPage, AdminCategoriesPage, AdminProductsPage, AdminOrdersPage, TableQRPage, WaiterDashboardPage) - README já lista 11 na tabela
3. **Seção "Fluxos por Persona" → Cliente**: Adicionar menção de cobertura de recuperação de senha

## Verificação

Executar `cat tests/e2e/README.md | grep -E "(Recuperação|Page Objects|coberto)"` para confirmar mudanças.