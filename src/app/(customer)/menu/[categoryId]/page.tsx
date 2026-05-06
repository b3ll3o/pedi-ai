import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryPageClient from './CategoryPageClient';

interface PageProps {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ restaurant?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: 'Categoria do Cardápio | Pedi-AI - Produtos Selecionados',
    description: 'Confira todos os produtos disponíveis nesta categoria do cardápio digital do restaurante. Adicione ao carrinho e faça seu pedido com segurança mesmo offline.',
    alternates: {
      canonical: params.restaurant ? `/restaurantes/${params.restaurant}/cardapio` : '/restaurantes',
    },
    openGraph: {
      title: 'Categoria | Pedi-AI',
      description: 'Produtos desta categoria do cardápio digital.',
      url: params.restaurant ? `/restaurantes/${params.restaurant}/cardapio` : '/restaurantes',
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params: paramsPromise, searchParams }: PageProps) {
  const { categoryId } = await paramsPromise;
  const params = await searchParams;
  const restaurantId = params.restaurant;

  if (!restaurantId) {
    notFound();
  }

  return <CategoryPageClient categoryId={categoryId} restaurantId={restaurantId} />;
}
