# Design: KDS (Kitchen Display System)

## Overview

Adaptar/implementar KDS para exibir pedidos em tempo real na cozinha e permitir atualização de status com um toque.

---

## Estrutura de Arquivos

```
src/app/
└── kitchen/
    └── page.tsx           # KDS principal

src/components/
└── kds/
    ├── OrderCard.tsx      # Card individual de pedido
    ├── OrderList.tsx      # Lista de pedidos
    ├── StatusFilter.tsx   # Filtros por status
    └── Timer.tsx          # Componente de tempo
```

---

## Páginas Existentes

### `/kitchen` — KDS (já existe)

**Verificar:**
- `src/app/kitchen/page.tsx`
- `src/components/kitchen/` (se existir)

**Provavelmente precisa de:**
- Remover integração de pagamento
- Adicionar filtros por status
- Mostrar tempo desde criação
- Melhorar UX de atualização de status

---

## Componentes

### OrderCard

```tsx
interface OrderCardProps {
  pedido: {
    id: string;
    numero: number;
    status: StatusPedido;
    mesaLabel: string;
    itens: ItemPedido[];
    observacao?: string;
    createdAt: Date;
  };
  onStatusChange: (id: string, status: StatusPedido) => void;
}
```

**Layout:**
```
┌─────────────────────────┐
│ #1234              5min │  ← Header: número + tempo
│ Mesa 5                  │  ← Label da mesa
├─────────────────────────┤
│ 2x Burger               │  ← Itens
│    P, Sem cebola        │
│ 1x Refri                │
├─────────────────────────┤
│ OBS: sem cebola         │  ← Observação (se houver)
├─────────────────────────┤
│ [PREPARAR]              │  ← Botão de ação
└─────────────────────────┘
```

### Timer

```tsx
// Atualiza automaticamente
// Formato: "X min" ou "Xh Ymin" se > 1 hora
// Cor: verde < 5min, amarelo 5-10min, vermelho > 10min
```

---

## API Integration

### Listar Pedidos

```typescript
const { data, error } = await supabase
  .from('pedidos')
  .select('*, mesa:mesas(numero)')
  .in('status', ['recebido', 'preparando', 'pronto'])
  .order('createdAt', { ascending: true });
```

### Atualizar Status

```typescript
const { data, error } = await supabase
  .from('pedidos')
  .update({ status: 'preparando' })
  .eq('id', pedidoId)
  .select()
  .single();
```

---

## Real-time

```typescript
// Subscribe a mudanças
supabase
  .channel('pedidos-kds')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'pedidos',
    filter: 'status=in.(recebido,preparando,pronto)'
  }, (payload) => {
    // Atualizar UI
  })
  .subscribe();
```

---

## Audio Alert

```typescript
// Tocar som quando novo pedido chega
const playAlert = () => {
  const audio = new Audio('/sounds/new-order.mp3');
  audio.play();
};
```

---

## Responsive

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | 1 coluna, cards empilhados |
| Tablet (640-1024px) | 2 colunas |
| Desktop (>1024px) | 3 colunas (recebido, preparando, pronto) |

---

## Checklist

- [ ] Criar/adaptar `kitchen/page.tsx`
- [ ] Criar componente `OrderCard`
- [ ] Criar componente `Timer`
- [ ] Implementar filtros por status
- [ ] Integrar real-time com Supabase
- [ ] Adicionar audio alert
- [ ] Testar em diferentes tamanhos de tela
