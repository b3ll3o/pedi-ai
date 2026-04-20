import type { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  return {
    title: 'Produto | Pedi-AI',
    description: 'Veja os detalhes deste produto do cardápio.',
    alternates: {
      canonical: '/menu',
    },
    openGraph: {
      title: 'Produto | Pedi-AI',
      description: 'Detalhes do produto.',
      url: '/menu',
      type: 'website',
    },
  };
}

export default async function ProductDetailPage({ params: paramsPromise }: PageProps) {
  const { productId } = await paramsPromise;

  return <ProductDetailClient productId={productId} />;
}
