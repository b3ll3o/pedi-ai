import type { Metadata } from 'next';
import { Suspense } from 'react';
import { useRestaurante } from '@/hooks/useRestaurante';
import { PublicMenuBySlugClient } from './PublicMenuBySlugClient';

interface PublicMenuBySlugPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mesaId?: string }>;
}

export async function generateMetadata({ params }: PublicMenuBySlugPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: 'Cardápio | Pedi-AI',
    description: 'Veja o cardápio do restaurante e faça seu pedido online. Funciona offline.',
    robots: 'index, follow',
  };
}

export default async function PublicMenuBySlugPage({ params, searchParams }: PublicMenuBySlugPageProps) {
  const { slug } = await params;
  const { mesaId } = await searchParams;

  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>}>
      <PublicMenuBySlugClient slug={slug} mesaId={mesaId} />
    </Suspense>
  );
}
