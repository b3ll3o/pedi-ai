# Tasks: KDS (Kitchen Display System)

## Specs

- [x] `specs/kds-mvp/spec.md` — RFC 2119 spec
- [x] `specs/kds-mvp/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. KDS Page

#### 1.1 Verificar KDS existente

- [ ] Verificar `src/app/kitchen/page.tsx`
- [ ] Verificar `src/components/kitchen/` ou `src/components/kds/`
- [ ] Mapear o que já existe vs precisa criar

**Arquivos:** `src/app/kitchen/page.tsx`

#### 1.2 Adaptar page para MVP

- [ ] Remover lógica de pagamento (não existe mais)
- [ ] Adicionar filtros por status
- [ ] Integrar real-time
- [ ] Adicionar audio alert

**Arquivos:** `src/app/kitchen/page.tsx`

---

### 2. Componentes

#### 2.1 OrderCard

- [ ] Criar componente `OrderCard`
- [ ] Exibir número do pedido, mesa, itens
- [ ] Exibir tempo desde criação
- [ ] Exibir botão de ação baseado no status
- [ ] Hook para som ao receber novo pedido

**Arquivo:** `src/components/kds/OrderCard.tsx`

#### 2.2 Timer

- [ ] Criar componente `Timer`
- [ ] Atualizar automaticamente
- [ ] Formatar: "X min" ou "Xh Ymin"
- [ ] Cor baseada no tempo (verde/amarelo/vermelho)

**Arquivo:** `src/components/kds/Timer.tsx`

#### 2.3 OrderList

- [ ] Criar componente `OrderList`
- [ ] Receber lista de pedidos
- [ ] Renderizar OrderCards
- [ ] Agrupar por status em colunas (desktop)

**Arquivo:** `src/components/kds/OrderList.tsx`

#### 2.4 StatusFilter

- [ ] Criar componente `StatusFilter`
- [ ] Botões para filtrar: Todos, Recebido, Preparando, Pronto
- [ ] Estado ativo visual

**Arquivo:** `src/components/kds/StatusFilter.tsx`

---

### 3. API Integration

#### 3.1 Listar pedidos

- [ ] Hook `usePedidosKDS()`
- [ ] Buscar pedidos com status `recebido`, `preparando`, `pronto`
- [ ] Ordenar por `createdAt`
- [ ] Incluir dados da mesa

**Arquivo:** `src/hooks/usePedidosKDS.ts`

#### 3.2 Atualizar status

- [ ] Função `atualizarStatusPedido(id, status)`
- [ ] Chamar `PATCH /api/pedidos/[id]/status`
- [ ] Atualizar store local

**Arquivo:** `src/hooks/usePedidosKDS.ts`

#### 3.3 Real-time

- [ ] Configurar Supabase Realtime subscription
- [ ] Atualizar lista quando houver mudanças
- [ ] Tocar som quando novo pedido chega

**Arquivo:** `src/hooks/usePedidosKDS.ts`

---

### 4. Audio

#### 4.1 Alert de novo pedido

- [ ] Adicionar arquivo de som `/public/sounds/new-order.mp3`
- [ ] Hook ou util para tocar som
- [ ] Tocar quando `recebido` é adicionado

---

### 5. UI/UX

#### 5.1 Responsive

- [ ] Mobile: 1 coluna
- [ ] Tablet: 2 colunas
- [ ] Desktop: 3 colunas (status分组)

#### 5.2 Visual

- [ ] Animação ao receber novo pedido (highlight)
- [ ] Cores para cada status
- [ ] Indicador de tempo crítico (>10min)

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

- [ ] `npm run build` passa
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
[  0/21] tarefas completas
```
