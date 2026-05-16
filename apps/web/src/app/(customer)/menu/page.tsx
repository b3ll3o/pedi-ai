import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import MenuPageClient from './MenuPageClient';

interface MenuPageProps {
  searchParams: Promise<{ restaurant?: string }>;
}

export async function generateMetadata({ searchParams }: MenuPageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: 'Cardápio Digital | Pedi-AI - Faça Seu Pedido Online',
    description:
      'Explore o cardápio digital do restaurante. Veja categorias, produtos e faça seu pedido online. Funciona offline e descubra promoções.',
    alternates: {
      canonical: params.restaurant
        ? `/restaurantes/${params.restaurant}/cardapio`
        : '/restaurantes',
    },
    openGraph: {
      title: 'Cardápio Digital | Pedi-AI',
      description: 'Explore o cardápio digital do restaurante e faça seu pedido online.',
      url: params.restaurant ? `/restaurantes/${params.restaurant}/cardapio` : '/restaurantes',
      type: 'website',
    },
  };
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const params = await searchParams;
  const restaurantId = params.restaurant;

  if (!restaurantId) {
    redirect('/restaurantes');
  }

  return <MenuPageClient restaurantId={restaurantId} />;
}
