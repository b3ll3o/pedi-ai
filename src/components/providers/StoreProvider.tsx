'use client';

import { createContext, useContext, useEffect } from 'react';
import { hydrateCartFromIndexedDB } from '@/stores/cartStore';
import { processQueue } from '@/lib/offline/sync';

const STORE_KEY = 'pedi-ai-cart';

function hasStoredCart(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORE_KEY) !== null;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!hasStoredCart()) {
      hydrateCartFromIndexedDB();
    }
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
