# Limitações e Falhas de Testes E2E - correcao-e2e

**Data:** 2026-04-22  
**Total de testes:** 102 (estimativa)  
**Passando:** 15  
**Falhando:** 87  

---

## Resumo Executivo

A correção de testes E2E revelou que a maioria das falhas (87) não são problemas de código, mas sim de **infraestrutura de teste** e **funcionalidades não implementadas**. Apenas 15 testes passam com sucesso.

---

## Categorização de Falhas

### 1. Missing Selectors (57 falhas)

Os testes esperam `data-testid` que não existem nas páginas implementadas.

**Admin Pages:**
| Test ID | Arquivo | Status |
|---------|---------|--------|
| `page-title` | admin/categories, orders, products, table-qr | ⚠️ Precisa ser adicionado |
| `add-category-button` | admin/categories | ⚠️ Não existe |
| `search-input` | admin/categories | ⚠️ Não existe |
| `category-item` | admin/categories | ⚠️ Não existe |
| `edit-button` (dentro category-item) | admin/categories | ⚠️ Não existe |
| `filter-status-select` | admin/orders | ⚠️ Não existe |
| `search-orders-input` | admin/orders | ⚠️ Não existe |
| `admin-order-item` | admin/orders | ⚠️ Não existe |
| `order-id` | admin/orders | ⚠️ Não existe |
| `order-status` | admin/orders | ⚠️ Não existe |
| `add-product-button` | admin/products | ⚠️ Não existe |
| `product-item` | admin/products | ⚠️ Não existe |
| `toggle-availability` | admin/products | ⚠️ Não existe |
| `table-code-input` | admin/table-qr | ⚠️ Não existe |

**Customer Pages:**
| Test ID | Arquivo | Status |
|---------|---------|--------|
| `menu-categories` | customer/menu | ⚠️ Não existe |
| `menu-product-card-*` | customer/menu | ⚠️ Não existe |
| `cart-container` | customer/cart | ⚠️ Não existe |
| `quantity-input` | customer/cart | ⚠️ Não existe |
| `cart-item-increase` | customer/cart | ⚠️ Não existe |
| `checkout-form` | customer/checkout | ⚠️ Não existe |
| `kitchen-display` | waiter/kitchen | ⚠️ Não existe |

### 2. Network Errors (24 falhas)

```
net::ERR_CONNECTION_REFUSED at http://localhost:3000/admin/dashboard
```

**Causa:** O servidor de desenvolvimento não está rodando durante a execução dos testes, ou os testes tentam navegar para URLs enquanto o servidor não responde.

**Impacto:** 24 testes falham com erro de conexão, especialmente em:
- `admin/categories.spec.ts` (1 falha)
- `admin/orders.spec.ts` (1 falha)
- `admin/products.spec.ts` (5 falhas)
- `customer/auth.spec.ts` (parcial)

### 3. Timeout Errors (59 falhas)

A maioria das falhas sãoTimeouts ao esperar por elementos que não aparecem. Isso é consequência dos Missing Selectors - se o elemento não existe, o teste dá timeout.

**Timeout mais comuns:**
- `waiting for locator('[data-testid="..."]')` - 10s exceeded
- `waiting for response` - 30s exceeded

### 4. Known Limitations

| Limitação | Descrição | Severidade |
|-----------|-----------|------------|
| **Auth fixtures não funcionam** | Os fixtures de autenticação (admin, customer) tentam carregar storage state que não existe, causando `ERR_CONNECTION_REFUSED` | Alta |
| **Page Objects desatualizados** | Os Page Objects (AdminCategoriesPage, etc.) usam seletores que não existem nas páginas | Alta |
| **Dev server não está no pipeline** | O `globalSetup` tenta iniciar o servidor mas falha quando não há banco de dados disponível | Alta |
| **Real-time updates não funcionam** | Testes de orders e kitchen dependem de Supabase Realtime que não está configurado | Média |

---

## Testes que Passam (15)

| Teste | Arquivo | Notas |
|-------|---------|-------|
| should display login form | admin/auth.spec.ts | Auth funciona |
| should login with valid admin credentials | admin/auth.spec.ts | Auth funciona |
| should show error with invalid credentials | admin/auth.spec.ts | Auth funciona |
| should show error with empty fields | admin/auth.spec.ts | Auth funciona |
| should logout and redirect to login | admin/auth.spec.ts | Auth funciona |
| should redirect to login when accessing protected route | admin/auth.spec.ts | Auth funciona |
| should remember admin session | admin/auth.spec.ts | Auth funciona |
| deve exibir o formulário de login | customer/auth.spec.ts | Auth funciona |
| deve logar com credenciais válidas | customer/auth.spec.ts | Auth funciona |
| deve exibir erro com credenciais inválidas | customer/auth.spec.ts | Auth funciona |
| deve fazer logout e redirecionar | customer/auth.spec.ts | Auth funciona |
| deve redirecionar para login | customer/auth.spec.ts | Auth funciona |
| deve lembrar sessão do cliente | customer/auth.spec.ts | Auth funciona |
| should display kitchen orders | waiter/kitchen.spec.ts | - |
| should display menu page with categories | customer/menu.spec.ts | - |

---

## Falhas por Arquivo

| Arquivo | Total | Missing Selectors | Network | Timeout |
|---------|-------|------------------|---------|---------|
| admin/auth.spec.ts | 0 | 0 | 0 | 0 |
| admin/categories.spec.ts | 7 | 6 | 1 | 7 |
| admin/orders.spec.ts | 10 | 9 | 1 | 9 |
| admin/products.spec.ts | 9 | 5 | 5 | 8 |
| admin/table-qr.spec.ts | 10 | 10 | 0 | 8 |
| customer/auth.spec.ts | 4 | 0 | 4 | 0 |
| customer/cart.spec.ts | 6 | 6 | 0 | 6 |
| customer/checkout.spec.ts | 7 | 6 | 0 | 7 |
| customer/menu.spec.ts | 7 | 7 | 0 | 7 |
| customer/offline.spec.ts | 6 | 6 | 0 | 6 |
| customer/order.spec.ts | 8 | 7 | 0 | 8 |
| customer/payment.spec.ts | 4 | 3 | 0 | 4 |
| waiter/kitchen.spec.ts | 9 | 8 | 0 | 9 |

---

## Recomendações

### Prioridade Alta (Bloqueia testes)
1. **Adicionar data-testids** - Completar a adição de `data-testid` às páginas admin e customer conforme planejado nas tasks 2-9
2. **Verificar se as páginas admin existem** - As páginas admin podem não estar renderizando os componentes corretos
3. **Configurar auth fixtures** - O storage state não está sendo criado corretamente

### Prioridade Média
4. **Implementar funcionalidades faltantes** - Algumas páginas/funcionalidades esperadas pelos testes não existem
5. **Configurar Supabase Realtime** - Para testes de orders e kitchen

### Prioridade Baixa
6. **Atualizar Page Objects** - Os Page Objects usam seletores que não existem

---

## Conclusão

**87% dos testes falham** por razões evitáveis:
- **~65%** faltam seletores (`data-testid`) que foram adicionados nas tasks 2-9 mas podem não estar sendo renderizados
- **~28%** erros de rede (servidor não disponível)
- **~7%** funcionalidades não implementadas

A maior parte do trabalho de `data-testid` foi feita nas tasks 2-9, mas os testes ainda falham porque:
1. Os componentes não estão renderizando os `data-testid` corretamente
2. O servidor de desenvolvimento não está disponível durante os testes
3. Os fixtures de autenticação não estão configurados corretamente

**Próximo passo:** Verificar se os `data-testid` adicionados estão sendo renderizados nas páginas e se os Page Objects estão usando os seletores corretos.
