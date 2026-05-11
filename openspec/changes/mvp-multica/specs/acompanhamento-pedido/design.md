# Design: Acompanhamento de Pedido

## Overview

Página de tracking para cliente acompanhar status do pedido em tempo real.

---

## Estrutura de Arquivos

```
src/app/
└── pedido/
    └── [id]/
        └── page.tsx           # Página de tracking

src/components/
└── order/
    ├── OrderStatus.tsx        # Timeline de status
    ├── OrderItems.tsx         # Lista de itens
    ├── OrderHeader.tsx        # Header com número e mesa
    └── StatusTimeline.tsx     # Timeline visual
```

---

## Página

```tsx
// src/app/pedido/[id]/page.tsx
export default async function OrderTrackingPage({
  params: { id }
}: {
  params: { id: string }
}) {
  const pedido = await getPedido(id);

  return (
    <main>
      <OrderHeader pedido={pedido} />
      <StatusTimeline status={pedido.status} />
      <OrderStatus status={pedido.status} />
      <OrderItems itens={pedido.itens} total={pedido.total} />
    </main>
  );
}
```

---

## Componentes

### StatusTimeline

```tsx
// Timeline visual: ●──●──●──○
const statuses = ['recebido', 'preparando', 'pronto', 'entregue'];

const currentIndex = statuses.indexOf(status);

return (
  <div className="flex items-center">
    {statuses.map((s, i) => (
      <>
        <div className={i <= currentIndex ? 'active' : ''}>
          <Icon status={s} />
        </div>
        {i < statuses.length - 1 && (
          <div className={i < currentIndex ? 'line-active' : 'line'} />
        )}
      </>
    ))}
  </div>
);
```

### OrderStatus

```tsx
// Texto descritivo baseado no status
const messages = {
  recebido: 'Seu pedido foi recebido!',
  preparando: 'Estamos preparando seu pedido',
  pronto: 'Seu pedido está pronto!',
  entregue: 'Pedido entregue',
};

// Tempo no status atual
const timeInStatus = getTimeInStatus(pedido.updatedAt);
```

---

## Real-time Hook

```typescript
// src/hooks/useOrderTracking.ts
export function useOrderTracking(pedidoId: string) {
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel(`pedido:${pedidoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        filter: `id=eq.${pedidoId}`
      }, (payload) => {
        setPedido(payload.new);
        if (payload.new.status === 'pronto') {
          showToast('Pedido pronto!');
          playSound();
        }
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [pedidoId]);

  return pedido;
}
```

---

## API

### getPedido

```typescript
export async function getPedido(id: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      mesa:mesas(numero),
      itens:itens_pedido(
        *,
        produto:produtos(nome)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error('Pedido não encontrado');
  return data;
}
```

---

## Checklist

- [ ] Criar página `/pedido/[id]/page.tsx`
- [ ] Criar `StatusTimeline` component
- [ ] Criar `OrderHeader` component
- [ ] Criar `OrderItems` component
- [ ] Implementar `useOrderTracking` hook com realtime
- [ ] Adicionar notificação (toast + som)
- [ ] Testar atualização em tempo real
