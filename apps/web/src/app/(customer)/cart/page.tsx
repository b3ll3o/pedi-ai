import type { Metadata } from 'next';
import CartClient from './CartClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Carrinho de Pedidos | Pedi-AI - Revise Seu Pedido',
    description:
      'Revise os itens do seu pedido antes de finalizar. Adicione mais produtos, remova itens ou ajuste quantidades no carrinho antes do checkout.',
    alternates: {
      canonical: '/cart',
    },
    openGraph: {
      title: 'Carrinho | Pedi-AI',
      description: 'Itens do seu pedido para revisão.',
      url: '/cart',
      type: 'website',
    },
  };
}

export default function CartPage() {
  return <CartClient />;
}
