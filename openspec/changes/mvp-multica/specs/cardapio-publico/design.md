# Design: Cardápio Público

## Overview

Criar rota pública `/r/[slug]` para exibir cardápio de restaurante acessado via QR code.

---

## Estrutura de Arquivos

```
src/app/
└── r/
    └── [slug]/
        ├── page.tsx           # Cardápio (Server Component)
        └── produto/
            └── [id]/
                └── page.tsx   # Detail do produto

src/components/
└── menu/
    ├── MenuHeader.tsx         # Header com logo e nome
    ├── CategoryList.tsx       # Lista de categorias
    ├── ProductGrid.tsx        # Grid de produtos
    ├── ProductCard.tsx        # Card individual
    └── ProductDetail.tsx      # Modal/page de detail

src/hooks/
└── useCardapio.ts             # Hook para carregar cardápio
```

---

## Páginas

### `/r/[slug]`

```tsx
// Server Component
export default async function CardapioPage({
  params: { slug },
  searchParams: { mesaId }
}: {
  params: { slug: string }
  searchParams: { mesaId?: string }
}) {
  const restaurante = await getRestauranteBySlug(slug);
  const cardapio = await getCardapio(restaurante.id);

  return (
    <main>
      <MenuHeader restaurante={restaurante} />
      <CategoryList categorias={cardapio.categorias} />
      <CartButton />
    </main>
  );
}
```

---

## Componentes

### MenuHeader

```tsx
interface MenuHeaderProps {
  restaurante: {
    nome: string;
    logo: string;
    horario: { abertura: string; fechamento: string };
  };
}
```

### CategoryList

```tsx
interface CategoryListProps {
  categorias: Categoria[];
}
// Scroll suave para categoria ao clicar
// Sticky header com categoria atual
```

### ProductCard

```tsx
interface ProductCardProps {
  produto: {
    id: string;
    nome: string;
    preco: number;
    imagem?: string;
    disponivel: boolean;
  };
  onAdd: (produto: Produto) => void;
}
```

---

## API Integration

### getRestauranteBySlug

```typescript
export async function getRestauranteBySlug(slug: string) {
  const { data, error } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single();

  if (error || !data) throw new Error('Restaurante não encontrado');
  return data;
}
```

### getCardapio

```typescript
export async function getCardapio(restauranteId: string) {
  const { data: categorias } = await supabase
    .from('categorias')
    .select(`
      *,
      produtos (
        *,
        grupos_modificadores (
          *,
          valores_modificador
        )
      )
    `)
    .eq('restaurante_id', restauranteId)
    .eq('ativo', true)
    .order('ordem');

  return { categorias };
}
```

---

## QR Code Payload

```typescript
interface QRCodePayload {
  restauranteId: string;
  mesaId: string;
  timestamp: number;
  signature: string; // HMAC-SHA256
}

// No admin: gerar QR code
const payload = JSON.stringify({ restauranteId, mesaId, timestamp });
const signature = hmacSha256(payload, restauranteSecret);
const qrUrl = `/r/${restauranteSlug}?mesaId=${mesaId}&t=${timestamp}&s=${signature}`;

// Na página: validar
const isValid = verifyHmacSignature(payload, signature, restauranteSecret);
```

---

## Offline Strategy

```typescript
// useCardapio.ts
const useCardapio = (restauranteId: string) => {
  // 1. Tentar IndexedDB primeiro
  // 2. Se vazio ou expirado, buscar da API
  // 3. Salvar em IndexedDB com TTL 24h

  const cacheKey = `cardapio:${restauranteId}`;
  const ttl = 24 * 60 * 60 * 1000; // 24h

  // ...
};
```

---

## Carrinho Integration

```typescript
// Ao adicionar item
const addToCart = (produto: Produto, modificadores?: Modificador[]) => {
  useCartStore.getState().addItem({
    produtoId: produto.id,
    nome: produto.nome,
    preco: produto.preco,
    modificadores,
    quantidade: 1
  });
};

// MesaId vem da URL (query params)
const mesaId = searchParams.mesaId;

// Ao enviar pedido
const submitOrder = async () => {
  const items = useCartStore.getState().items;
  await api.post('/api/pedidos', {
    restaurantId: restauranteId,
    mesaId,
    itens: items
  });
};
```

---

## Responsive

| Breakpoint | Layout |
|------------|--------|
| Mobile | Lista de categorias + produtos |
| Tablet | Sidebar categorias + grid |
| Desktop | Header expandido + 3 colunas |

---

## Checklist

- [ ] Criar rota `/r/[slug]/page.tsx`
- [ ] Criar `MenuHeader` component
- [ ] Criar `CategoryList` component
- [ ] Criar `ProductCard` component
- [ ] Implementar `useCardapio` hook com cache
- [ ] Integrar com `useCartStore`
- [ ] Validar QR code (se tiver signature)
- [ ] Implementar offline (IndexedDB)
