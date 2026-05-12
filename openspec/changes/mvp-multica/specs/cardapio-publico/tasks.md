# Tasks: Cardápio Público

## Specs

- [x] `specs/cardapio-publico/spec.md` — RFC 2119 spec
- [x] `specs/cardapio-publico/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. Estrutura de Rotas

#### 1.1 Criar rota `/r/[restaurantId]`

- [x] Criar pasta `src/app/r/`
- [x] Criar pasta `src/app/r/[restaurantId]/`
- [x] Criar `page.tsx` (Server Component)
- [x] Buscar restaurante por ID
- [x] Buscar cardápio do restaurante (via useCardapio)

**Arquivos:**
- `src/app/r/[restaurantId]/page.tsx`
- `src/app/r/[restaurantId]/PublicMenuClient.tsx`

---

### 2. Componentes de Menu

#### 2.1 MenuHeader

- [ ] Criar componente
- [ ] Exibir logo e nome do restaurante
- [ ] Exibir horário de funcionamento
- [ ] Indicador de online/offline

**Arquivo:** `src/components/menu/MenuHeader.tsx`

#### 2.2 CategoryList

- [ ] Criar componente
- [ ] Lista de categorias ordenadas
- [ ] Navegação por âncora (smooth scroll)
- [ ] Sticky header com categoria atual

**Arquivo:** `src/components/menu/CategoryList.tsx`

#### 2.3 ProductCard

- [ ] Criar componente
- [ ] Exibir nome, preço, imagem
- [ ] Badge de disponibilidade
- [ ] Botão "+" para adicionar
- [ ] Indicador de modificadores

**Arquivo:** `src/components/menu/ProductCard.tsx`

#### 2.4 ProductGrid

- [ ] Criar componente
- [ ] Grid responsivo de produtos
- [ ] Agrupar por categoria

**Arquivo:** `src/components/menu/ProductGrid.tsx`

---

### 3. Product Detail

#### 3.1 Página de detail

- [ ] Criar `src/app/r/[slug]/produto/[id]/page.tsx`
- [ ] Exibir produto completo
- [ ] Listar modificadores
- [ ] Seletor de quantidade
- [ ] Botão adicionar ao carrinho

**Arquivo:** `src/app/r/[slug]/produto/[id]/page.tsx`

#### 3.2 Modal (alternativa)

- [ ] Criar `ProductDetailModal`
- [ ] Abrir ao clicar no card
- [ ] Fechar ao adicionar ou fora

**Arquivo:** `src/components/menu/ProductDetailModal.tsx`

---

### 4. Hooks

#### 4.1 useCardapio

- [ ] Hook para buscar cardápio
- [ ] Cache em IndexedDB (TTL 24h)
- [ ] Fallback offline
- [ ] Loading states

**Arquivo:** `src/hooks/useCardapio.ts`

#### 4.2 useRestaurante

- [x] Hook para buscar dados do restaurante
- [x] Por slug
- [x] Validação de ativo

**Arquivo:** `src/hooks/useRestaurante.ts`

---

### 5. Integração com Carrinho

#### 5.1 Carrinho na página

- [ ] Botão de carrinho no header
- [ ] Badge com quantidade
- [ ] Flyout com items

**Arquivo:** `src/components/cart/CartButton.tsx`

#### 5.2 MesaId

- [ ] Extrair `mesaId` dos query params
- [ ] Passar para criação de pedido

---

### 6. Offline

#### 6.1 Cache do cardápio

- [ ] Salvar cardápio em IndexedDB
- [ ] TTL de 24h
- [ ] Verificar cache antes de API

#### 6.2 Indicador offline

- [ ] Mostrar quando offline
- [ ] Mostrar dados em cache

---

### 7. API Routes

#### 7.1 GET /api/restaurantes/[slug]

- [x] Buscar restaurante por slug
- [x] Retornar dados públicos
- [x] 404 se não encontrado ou inativo

**Arquivo:** `src/app/api/restaurantes/[slug]/route.ts`

#### 7.2 GET /api/restaurantes/[slug]/cardapio

- [x] Buscar categorias com produtos
- [x] Incluir modificadores
- [x] Filtrar ativos
- [x] Ordenar por ordem

**Arquivo:** `src/app/api/restaurantes/[slug]/cardapio/route.ts`

---

### 8. Testes

#### 8.1 E2E

- [ ] `tests/e2e/customer/scan-qr.spec.ts`
  - Acessar via URL com mesaId
  - Verificar cardápio carrega

- [ ] `tests/e2e/customer/add-to-cart.spec.ts`
  - Adicionar item ao carrinho
  - Verificar modificadores

---

### 9. Verificação

- [ ] `npm run build` passa
- [ ] `npm run lint` passa
- [ ] Cardápio carrega corretamente
- [ ] Offline funciona após primeiro carregamento

---

## Task Metadata

```yaml
sdd: cardapio-publico
spec_file: specs/cardapio-publico/spec.md
design_file: specs/cardapio-publico/design.md
priority: medium
blocking: false  # Pode ser feito em paralelo com KDS
```

---

## Dependencies

- `checkout-sem-pagamento` — Para testar fluxo completo
- Estrutura de categorias e produtos no banco

---

## Progress

```
[ 14/25] tarefas completas
- Estrutura de rotas: implementada (/r/[slug])
- API Routes: implementadas (/api/restaurantes/[slug], /api/restaurantes/[slug]/cardapio)
- Hooks: useRestaurante implementado
- Componentes: CategoryList, ProductCard, ProductList existentes no projeto
```
