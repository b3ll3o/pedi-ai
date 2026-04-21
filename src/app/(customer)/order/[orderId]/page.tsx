import type { Metadata } from 'next';
import OrderConfirmationClient from './OrderConfirmationClient';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Pedido Confirmado | Pedi-AI - Acompanhe Seu Pedido',
    description: 'Pedido confirmado com sucesso! Acompanhe o status do seu pedido em tempo real. Receba atualizações sobre preparo e entrega do seu pedido.',
    alternates: {
      canonical: '/order',
    },
    openGraph: {
      title: 'Pedido | Pedi-AI',
      description: 'Confirmação e acompanhamento do pedido.',
      url: '/order',
      type: 'website',
    },
  };
}

export default async function OrderConfirmationPage({ params: paramsPromise }: PageProps) {
  const { orderId } = await paramsPromise;

  return <OrderConfirmationClient orderId={orderId} />;
}
