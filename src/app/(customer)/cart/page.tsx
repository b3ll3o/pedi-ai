import type { Metadata } from 'next';
import CartClient from './CartClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Carrinho | Pedi-AI',
    description: 'Veja os itens do seu pedido e prossiga para o checkout.',
    alternates: {
      canonical: '/cart',
    },
    openGraph: {
      title: 'Carrinho | Pedi-AI',
      description: 'Itens do seu pedido.',
      url: '/cart',
      type: 'website',
    },
  };
}

export default function CartPage() {
  return <CartClient />;
}
