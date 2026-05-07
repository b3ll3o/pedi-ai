'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  installPromptEvent: BeforeInstallPromptEvent | null;
  install(): Promise<void>;
}

export function usePWAInstall(): PWAInstallState {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(
    () => typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)').matches : false
  );

  const canInstall = installPromptEvent !== null;

  useEffect(() => {
    // AppInstalled event fires after PWA is installed — update state
    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsInstalled(true);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Only store the first event — prevent overwriting on subsequent fires
      setInstallPromptEvent((current) => current ?? (e as BeforeInstallPromptEvent));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPromptEvent) {
      return;
    }

    setIsInstalling(true);
    try {
      await installPromptEvent.prompt();
      await installPromptEvent.userChoice;
    } finally {
      setInstallPromptEvent(null);
      setIsInstalling(false);
    }
  }, [installPromptEvent]);

  return {
    canInstall,
    isInstalled,
    isInstalling,
    installPromptEvent,
    install,
  };
}