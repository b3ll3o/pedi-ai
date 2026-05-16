'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
