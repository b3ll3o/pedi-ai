'use client';

import { useEffect } from 'react';
import { processQueue } from '@/lib/offline/sync';

/**
 * Componente de inicialização da aplicação.
 * Sincroniza pedidos pendentes salvos em IndexedDB ao recarregar a app.
 * Executado uma única vez no mount.
 */
export function AppInitializer() {
  useEffect(() => {
    processQueue();
  }, []);

  return null;
}
