# Tasks: Acompanhamento de Pedido

## Specs

- [x] `specs/acompanhamento-pedido/spec.md` — RFC 2119 spec
- [x] `specs/acompanhamento-pedido/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. Página de Tracking

#### 1.1 Criar página

- [ ] Criar `src/app/pedido/[id]/page.tsx`
- [ ] Buscar dados do pedido
- [ ] Renderizar componentes

**Arquivo:** `src/app/pedido/[id]/page.tsx`

---

### 2. Componentes

#### 2.1 StatusTimeline

- [ ] Criar componente de timeline visual
- [ ] Ícones para cada status
- [ ] Linha de conexão entre status
- [ ] Status ativo destacado

**Arquivo:** `src/components/order/StatusTimeline.tsx`

#### 2.2 OrderHeader

- [ ] Número do pedido
- [ ] Identificação da mesa
- [ ] Data/hora do pedido

**Arquivo:** `src/components/order/OrderHeader.tsx`

#### 2.3 OrderItems

- [ ] Lista de itens
- [ ] Modificadores de cada item
- [ ] Total do pedido

**Arquivo:** `src/components/order/OrderItems.tsx`

#### 2.4 OrderStatus

- [ ] Mensagem descritiva por status
- [ ] Tempo no status atual
- [ ] Animação para status "pronto"

**Arquivo:** `src/components/order/OrderStatus.tsx`

---

### 3. Hooks

#### 3.1 useOrderTracking

- [ ] Subscribe a Supabase Realtime
- [ ] Atualizar estado quando status mudar
- [ ] Notificação quando "pronto"
- [ ] Cleanup ao desmontar

**Arquivo:** `src/hooks/useOrderTracking.ts`

---

### 4. API

#### 4.1 GET /api/pedidos/[id]

- [ ] Buscar pedido com itens e mesa
- [ ] Retornar histórico de status
- [ ] 404 se não encontrado

**Arquivo:** `src/app/api/pedidos/[id]/route.ts`

---

### 5. Notificações

#### 5.1 Toast

- [ ] Mostrar toast quando status muda
- [ ] Toast específico para "pronto"

#### 5.2 Som

- [ ] Tocar som quando pedido pronto
- [ ] Utilizar Howl ou Audio API

---

### 6. Offline

#### 6.1 Ultimo status

- [ ] Salvar último status em IndexedDB
- [ ] Mostrar se offline

---

### 7. Testes

#### 7.1 E2E

- [ ] `tests/e2e/customer/track-order.spec.ts`
  - Acessar página de tracking
  - Verificar timeline
  - Simular mudança de status
  - Verificar notificação

---

### 8. Verificação

- [ ] `npm run build` passa
- [ ] `npm run lint` passa
- [ ] Realtime funciona
- [ ] Notificação aparece

---

## Task Metadata

```yaml
sdd: acompanhamento-pedido
spec_file: specs/acompanhamento-pedido/spec.md
design_file: specs/acompanhamento-pedido/design.md
priority: medium
blocking: false
```

---

## Dependencies

- `checkout-sem-pagamento` — Para criar pedidos
- `kds-mvp` — Para atualizar status

---

## Progress

```
[  0/18] tarefas completas
```
