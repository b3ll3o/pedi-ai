import type { Metadata } from 'next';
import { Suspense } from 'react';
import MenuPageClient from '@/app/(customer)/menu/MenuPageClient';

interface CardapioPageProps {
  params: Promise<{ restaurantId: string }>;
}

export async function generateMetadata({ params }: CardapioPageProps): Promise<Metadata> {
  const { restaurantId } = await params;

  return {
    title: 'Cardápio | Pedi-AI - Faça Seu Pedido Online',
    description:
      'Explore o cardápio digital do restaurante. Veja categorias, produtos e faça seu pedido online. Funciona offline.',
    alternates: {
      canonical: `/restaurantes/${restaurantId}/cardapio`,
    },
    openGraph: {
      title: 'Cardápio | Pedi-AI',
      description: 'Explore o cardápio digital e faça seu pedido online.',
      url: `/restaurantes/${restaurantId}/cardapio`,
      type: 'website',
    },
  };
}

export default async function CardapioPage({ params }: CardapioPageProps) {
  const { restaurantId } = await params;

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <MenuPageClient restaurantId={restaurantId} />
    </Suspense>
  );
}
