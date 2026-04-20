'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OrderConfirmation } from '@/components/order/OrderConfirmation';
import { OrderStatus } from '@/components/order/OrderStatus';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderConfirmationPage({ params }: PageProps) {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setOrderId(p.orderId));
  }, [params]);

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 p-6">
      <OrderConfirmation orderId={orderId} />
      <OrderStatus orderId={orderId} />
    </div>
  );
}