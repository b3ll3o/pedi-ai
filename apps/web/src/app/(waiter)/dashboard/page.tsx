'use client';

import Link from 'next/link';
import { useState } from 'react';

import Logo from '@/app/components/Logo';
import { ConnectionStatus } from '@/components/kitchen/ConnectionStatus';
import { WaiterDashboard } from '@/components/kitchen/WaiterDashboard';
import { useRealtimeConnection } from '@/hooks/useRealtimeOrders';

export default function WaiterDashboardPage() {
  const [restaurantId] = useState<string>('demo-restaurant');
  const { isConnected, latency } = useRealtimeConnection();

  if (!restaurantId) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
        <ConnectionStatus isConnected={isConnected} latency={latency} variant="badge" />
      </div>
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 100 }}>
        <Logo size={20} />
      </div>
      <Link
        href="/kitchen"
        data-testid="nav-kitchen"
        style={{ position: 'fixed', top: 48, left: 16, zIndex: 100 }}
      >
        Cozinha
      </Link>
      <WaiterDashboard restaurantId={restaurantId} />
    </div>
  );
}
