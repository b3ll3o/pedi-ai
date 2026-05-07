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
  const [isInstalled, setIsInstalled] = useState(false);

  const canInstall = installPromptEvent !== null;

  useEffect(() => {
    // Check initial standalone mode
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Only store the first event — prevent overwriting on subsequent fires
      setInstallPromptEvent((current) => current ?? (e as BeforeInstallPromptEvent));
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsInstalled(true);
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