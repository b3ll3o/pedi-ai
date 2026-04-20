import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Checkout | Pedi-AI',
    description: 'Finalize seu pedido e aguarde a confirmação.',
    alternates: {
      canonical: '/checkout',
    },
    openGraph: {
      title: 'Checkout | Pedi-AI',
      description: 'Finalize seu pedido.',
      url: '/checkout',
      type: 'website',
    },
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}
