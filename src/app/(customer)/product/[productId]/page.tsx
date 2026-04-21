import type { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  return {
    title: 'Detalhes do Produto | Pedi-AI - Veja Informações Completas',
    description: 'Veja descrição completa, preço atualizado e opções de personalização do produto do cardápio digital. Adicione ao carrinho para fazer seu pedido.',
    alternates: {
      canonical: '/menu',
    },
    openGraph: {
      title: 'Produto | Pedi-AI',
      description: 'Detalhes e informações do produto.',
      url: '/menu',
      type: 'website',
    },
  };
}

export default async function ProductDetailPage({ params: paramsPromise }: PageProps) {
  const { productId } = await paramsPromise;

  return <ProductDetailClient productId={productId} />;
}
