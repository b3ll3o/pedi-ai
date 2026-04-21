import type { Metadata } from 'next';
import CategoryPageClient from './CategoryPageClient';

interface PageProps {
  params: Promise<{ categoryId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Categoria do Cardápio | Pedi-AI - Produtos Selecionados',
    description: 'Confira todos os produtos disponíveis nesta categoria do cardápio digital do restaurante. Adicione ao carrinho e faça seu pedido com segurança mesmo offline.',
    alternates: {
      canonical: '/menu',
    },
    openGraph: {
      title: 'Categoria | Pedi-AI',
      description: 'Produtos desta categoria do cardápio digital.',
      url: '/menu',
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params: paramsPromise }: PageProps) {
  const { categoryId } = await paramsPromise;

  return <CategoryPageClient categoryId={categoryId} />;
}
