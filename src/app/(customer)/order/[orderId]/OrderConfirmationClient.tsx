'use client';

import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { OrderConfirmation } from '@/components/order/OrderConfirmation';
import { OrderStatus } from '@/components/order/OrderStatus';

interface OrderConfirmationClientProps {
  orderId: string;
}

export default function OrderConfirmationClient({ orderId }: OrderConfirmationClientProps) {
  return (
    <div className="flex flex-col items-center gap-8 p-6">
      <CustomerHeader />
      <OrderConfirmation orderId={orderId} />
      <OrderStatus orderId={orderId} />
    </div>
  );
}
