import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ restaurant?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: 'Detalhes do Produto | Pedi-AI - Veja Informações Completas',
    description:
      'Veja descrição completa, preço atualizado e opções de personalização do produto do cardápio digital. Adicione ao carrinho para fazer seu pedido.',
    alternates: {
      canonical: params.restaurant
        ? `/restaurantes/${params.restaurant}/cardapio`
        : '/restaurantes',
    },
    openGraph: {
      title: 'Produto | Pedi-AI',
      description: 'Detalhes e informações do produto.',
      url: params.restaurant ? `/restaurantes/${params.restaurant}/cardapio` : '/restaurantes',
      type: 'website',
    },
  };
}

export default async function ProductDetailPage({
  params: paramsPromise,
  searchParams,
}: PageProps) {
  const { productId } = await paramsPromise;
  const params = await searchParams;
  const restaurantId = params.restaurant;

  if (!restaurantId) {
    notFound();
  }

  return <ProductDetailClient productId={productId} />;
}
