import type { Metadata } from 'next';
import MenuPageClient from './MenuPageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Cardápio | Pedi-AI',
    description: 'Navegue pelo cardápio digital do restaurante. Explore categorias e produtos disponíveis.',
    alternates: {
      canonical: '/menu',
    },
    openGraph: {
      title: 'Cardápio | Pedi-AI',
      description: 'Navegue pelo cardápio digital do restaurante.',
      url: '/menu',
      type: 'website',
    },
  };
}

export default function MenuPage() {
  return <MenuPageClient />;
}
