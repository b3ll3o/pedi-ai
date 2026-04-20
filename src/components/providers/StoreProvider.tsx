'use client';

import { createContext, useContext, useEffect } from 'react';
import { hydrateCartFromIndexedDB } from '@/stores/cartStore';

interface StoreContextValue {
  // Placeholder for store context
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Hydrate cart from IndexedDB on app load
  useEffect(() => {
    hydrateCartFromIndexedDB();
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
