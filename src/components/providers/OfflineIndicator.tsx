'use client';

import { useEffect, useState } from 'react';
import { processQueue } from '@/lib/offline/sync';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function onOnline() {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
      // Sincronizar pedidos pendentes ao reconectar
      processQueue();
    }

    function onOffline() {
      setIsOnline(false);
      setShowRestored(false);
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className='offline-banner' data-testid='offline-indicator'>
        <span>📵</span>
        <span>Você está offline</span>
        <style jsx>{`
          .offline-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #333;
            color: #fff;
            text-align: center;
            padding: 8px 16px;
            font-size: 14px;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
        `}</style>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className='restored-toast' data-testid='online-indicator'>
        <span>✓</span>
        <span>Conexão restaurada</span>
        <style jsx>{`
          .restored-toast {
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            background: #4caf50;
            color: #fff;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: fadeInOut 3s ease-in-out forwards;
          }
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            10% { opacity: 1; transform: translateX(-50%) translateY(0); }
            80% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return null;
}