export function registerServiceWorker(): void {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    process.env.NODE_ENV === 'production'
  ) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
            }
          });
        });
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    });
  } else if (typeof window !== 'undefined') {
    console.warn('[SW] Service workers are not supported or not in production');
  }
}

export function unregisterServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}

export function notifyUpdate(): void {
  window.addEventListener('sw-update-available', () => {
    if (confirm('A new version is available. Reload to update?')) {
      window.location.reload();
    }
  });
}
