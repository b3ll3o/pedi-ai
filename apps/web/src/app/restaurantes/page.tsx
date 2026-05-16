import type { Metadata } from 'next';
import RestaurantesPageClient from './RestaurantesPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Restaurantes | Pedi-AI - Faça Seu Pedido Online',
    description:
      'Explore restaurantes disponíveis e faça seu pedido online. Escolha entre vários restaurantes com cardápios exclusivos.',
    alternates: {
      canonical: '/restaurantes',
    },
    openGraph: {
      title: 'Restaurantes | Pedi-AI',
      description: 'Explore restaurantes disponíveis e faça seu pedido online.',
      url: '/restaurantes',
      type: 'website',
    },
  };
}

export default function RestaurantesPage() {
  return <RestaurantesPageClient />;
}
