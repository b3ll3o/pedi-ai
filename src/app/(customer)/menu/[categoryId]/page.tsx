import type { Metadata } from 'next';
import CategoryPageClient from './CategoryPageClient';

interface PageProps {
  params: Promise<{ categoryId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Categoria | Pedi-AI',
    description: 'Veja os produtos desta categoria do cardápio digital.',
    alternates: {
      canonical: '/menu',
    },
    openGraph: {
      title: 'Categoria | Pedi-AI',
      description: 'Veja os produtos desta categoria.',
      url: '/menu',
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params: paramsPromise }: PageProps) {
  const { categoryId } = await paramsPromise;

  return <CategoryPageClient categoryId={categoryId} />;
}
