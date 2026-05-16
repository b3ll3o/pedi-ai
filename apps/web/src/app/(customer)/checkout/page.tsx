import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Checkout | Pedi-AI - Finalize Seu Pedido com Segurança',
    description:
      'Finalize seu pedido informando dados de entrega e pagamento. Revise seu pedido, preencha informações e aguarde a confirmação do restaurante em tempo real.',
    alternates: {
      canonical: '/checkout',
    },
    openGraph: {
      title: 'Checkout | Pedi-AI',
      description: 'Finalize seu pedido com segurança.',
      url: '/checkout',
      type: 'website',
    },
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}
