# Tasks: KDS (Kitchen Display System)

## Specs

- [x] `specs/kds-mvp/spec.md` — RFC 2119 spec
- [x] `specs/kds-mvp/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. KDS Page

#### 1.1 Verificar KDS existente

- [x] Verificar `src/app/kitchen/page.tsx`
- [x] Verificar `src/components/kitchen/` ou `src/components/kds/`
- [x] Mapear o que já existe vs precisa criar

**Arquivos:** `src/app/kitchen/page.tsx`

#### 1.2 Adaptar page para MVP

- [x] Remover lógica de pagamento (não existe mais)
- [x] Adicionar filtros por status
- [x] Integrar real-time
- [x] Adicionar audio alert

**Arquivos:** `src/app/kitchen/page.tsx`

---

### 2. Componentes

#### 2.1 OrderCard

- [x] Criar componente `OrderCard`
- [x] Exibir número do pedido, mesa, itens
- [x] Exibir tempo desde criação
- [x] Exibir botão de ação baseado no status
- [x] Hook para som ao receber novo pedido

**Arquivo:** `src/components/kds/OrderCard.tsx`

#### 2.2 Timer

- [x] Criar componente `Timer`
- [x] Atualizar automaticamente
- [x] Formatar: "X min" ou "Xh Ymin"
- [x] Cor baseada no tempo (verde/amarelo/vermelho)

**Arquivo:** `src/components/kds/Timer.tsx`

#### 2.3 OrderList

- [x] Criar componente `OrderList`
- [x] Receber lista de pedidos
- [x] Renderizar OrderCards
- [x] Agrupar por status em colunas (desktop)

**Arquivo:** `src/components/kds/OrderList.tsx`

#### 2.4 StatusFilter

- [x] Criar componente `StatusFilter`
- [x] Botões para filtrar: Todos, Recebido, Preparando, Pronto
- [x] Estado ativo visual

**Arquivo:** `src/components/kds/StatusFilter.tsx`

---

### 3. API Integration

#### 3.1 Listar pedidos

- [x] Hook `usePedidosKDS()`
- [x] Buscar pedidos com status `paid`, `preparando`, `pronto` (adaptado ao DB enum)
- [x] Ordenar por `createdAt`
- [x] Incluir dados da mesa

**Arquivo:** `src/hooks/usePedidosKDS.ts`

#### 3.2 Atualizar status

- [x] Função `atualizarStatusPedido(id, status)`
- [x] Chamar `PATCH /api/admin/orders/[id]/status`
- [x] Atualizar store local

**Arquivo:** `src/hooks/usePedidosKDS.ts`

#### 3.3 Real-time

- [x] Configurar Supabase Realtime subscription
- [x] Atualizar lista quando houver mudanças
- [x] Tocar som quando novo pedido chega

**Arquivo:** `src/hooks/usePedidosKDS.ts`

---

### 4. Audio

#### 4.1 Alert de novo pedido

- [x] Adicionar arquivo de som `/public/sounds/new-order.mp3`
- [x] Hook ou util para tocar som
- [x] Tocar quando `paid` é adicionado (usando Web Audio API)

---

### 5. UI/UX

#### 5.1 Responsive

- [x] Mobile: 1 coluna
- [x] Tablet: 2 colunas
- [x] Desktop: 3 colunas (status分组)

#### 5.2 Visual

- [x] Animação ao receber novo pedido (highlight)
- [x] Cores para cada status
- [x] Indicador de tempo crítico (>10min)

---

### 6. Testes

#### 6.1 E2E

- [ ] `tests/e2e/kitchen/kds-new-order.spec.ts`
   - Pedido aparece ao ser criado

- [ ] `tests/e2e/kitchen/kds-update-status.spec.ts`
   - Botão "Preparando" atualiza status
   - Botão "Pronto" atualiza status
   - Botão "Entregue" atualiza status

---

### 7. Verificação

- [x] `npm run build` passa
- [ ] `npm run lint` passa
- [ ] KDS carrega sem erros
- [ ] Pedidos aparecem em tempo real

---

## Task Metadata

```yaml
sdd: kds-mvp
spec_file: specs/kds-mvp/spec.md
design_file: specs/kds-mvp/design.md
priority: high
blocking: true  # Depende de checkout-sem-pagamento (pedidos precisam existir)
```

---

## Dependencies

- `checkout-sem-pagamento` — Pedidos precisam ser criados com status `recebido`
- Supabase Realtime — Já configurado no projeto

---

## Progress

```
[ 19/21] tarefas completas
- Testes E2E (6.1) pendentes
- Verificação lint e runtime pendentes
```
