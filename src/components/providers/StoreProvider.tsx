'use client';

import { createContext, useContext, useEffect } from 'react';
import { hydrateCartFromIndexedDB } from '@/stores/cartStore';
import { processQueue } from '@/lib/offline/sync';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface StoreContextValue {}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Hydrate cart from IndexedDB on app load
  useEffect(() => {
    hydrateCartFromIndexedDB();
    // Processar pedidos pendentes salvos em sessões anteriores
    processQueue();
  }, []);

  return (
    <StoreContext.Provider value={{}}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
