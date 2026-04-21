import type { Metadata } from 'next';
import MenuPageClient from './MenuPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Cardápio Digital | Pedi-AI - Faça Seu Pedido Online',
    description: 'Explore o cardápio digital do restaurante. Veja categorias, produtos e faça seu pedido online. Funciona offline e descubra promoções.',
    alternates: {
      canonical: '/menu',
    },
    openGraph: {
      title: 'Cardápio Digital | Pedi-AI',
      description: 'Explore o cardápio digital do restaurante e faça seu pedido online.',
      url: '/menu',
      type: 'website',
    },
  };
}

export default function MenuPage() {
  return <MenuPageClient />;
}
