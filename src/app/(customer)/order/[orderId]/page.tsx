import type { Metadata } from 'next';
import OrderConfirmationClient from './OrderConfirmationClient';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Pedido | Pedi-AI',
    description: 'Confirmação e acompanhamento do seu pedido.',
    alternates: {
      canonical: '/order',
    },
    openGraph: {
      title: 'Pedido | Pedi-AI',
      description: 'Confirmação do seu pedido.',
      url: '/order',
      type: 'website',
    },
  };
}

export default async function OrderConfirmationPage({ params: paramsPromise }: PageProps) {
  const { orderId } = await paramsPromise;

  return <OrderConfirmationClient orderId={orderId} />;
}
