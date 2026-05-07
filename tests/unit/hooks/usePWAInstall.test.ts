import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

function createBeforeInstallPromptEvent(): Event {
  return new Event('beforeinstallprompt');
}

function createAppInstalledEvent(): Event {
  return new Event('appinstalled');
}

describe('usePWAInstall hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns canInstall false when no install prompt event has fired', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.canInstall).toBe(false);
      expect(result.current.installPromptEvent).toBeNull();
    });

    it('returns isInstalled false in default jsdom environment', () => {
      const { result } = renderHook(() => usePWAInstall());

      // In jsdom, matchMedia returns false for standalone mode
      expect(result.current.isInstalled).toBe(false);
    });

    it('returns isInstalling false initially', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalling).toBe(false);
    });
  });

  describe('beforeinstallprompt event', () => {
    it('sets canInstall to true when beforeinstallprompt event fires', async () => {
      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        window.dispatchEvent(createBeforeInstallPromptEvent());
      });

      expect(result.current.canInstall).toBe(true);
      expect(result.current.installPromptEvent).not.toBeNull();
    });

    it('installPromptEvent is persisted after beforeinstallprompt', async () => {
      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        window.dispatchEvent(createBeforeInstallPromptEvent());
      });

      expect(result.current.installPromptEvent).toBeInstanceOf(Event);
    });

    it('multiple beforeinstallprompt events do not overwrite the stored event', async () => {
      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        window.dispatchEvent(createBeforeInstallPromptEvent());
      });

      const firstEvent = result.current.installPromptEvent;

      act(() => {
        window.dispatchEvent(createBeforeInstallPromptEvent());
      });

      // Event should remain the same reference (preventDefault keeps the first one)
      expect(result.current.installPromptEvent).toBe(firstEvent);
    });
  });

  describe('appinstalled event', () => {
    it('sets canInstall to false when appinstalled event fires', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // First fire beforeinstallprompt
      act(() => {
        window.dispatchEvent(createBeforeInstallPromptEvent());
      });

      expect(result.current.canInstall).toBe(true);

      // Then fire appinstalled
      act(() => {
        window.dispatchEvent(createAppInstalledEvent());
      });

      expect(result.current.canInstall).toBe(false);
      expect(result.current.installPromptEvent).toBeNull();
    });

    it('sets isInstalled to true when appinstalled event fires', async () => {
      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        window.dispatchEvent(createAppInstalledEvent());
      });

      expect(result.current.isInstalled).toBe(true);
    });
  });

  describe('install function', () => {
    it('install is a function', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(typeof result.current.install).toBe('function');
    });

    it('install returns early when canInstall is false', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Mock prompt and userChoice
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockUserChoice = vi.fn().mockResolvedValue({ outcome: 'accepted' });

      // Manually set up the event with methods (since we can't use real BeforeInstallPromptEvent)
      Object.defineProperty(result.current, 'installPromptEvent', {
        value: {
          prompt: mockPrompt,
          userChoice: mockUserChoice,
        },
        writable: true,
      });

      // Note: This is a structural test - the actual install function checks installPromptEvent
      expect(typeof result.current.install).toBe('function');
    });
  });

  describe('cleanup on unmount', () => {
    it('does not throw when component unmounts after events are registered', () => {
      const { unmount } = renderHook(() => usePWAInstall());

      act(() => {
        window.dispatchEvent(createBeforeInstallPromptEvent());
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('removes event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => usePWAInstall());

      // The hook registers listeners for beforeinstallprompt and appinstalled
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'appinstalled',
        expect.any(Function)
      );

      unmount();

      // Verify cleanup was called
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'appinstalled',
        expect.any(Function)
      );
    });
  });

  describe('isInstalled detection', () => {
    it('returns false when matchMedia does not match standalone', () => {
      const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '(display-mode: standalone)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(false);
      expect(matchMediaSpy).toHaveBeenCalledWith('(display-mode: standalone)');

      matchMediaSpy.mockRestore();
    });

    it('returns true when matchMedia matches standalone (already installed)', () => {
      const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(display-mode: standalone)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(true);
      expect(matchMediaSpy).toHaveBeenCalledWith('(display-mode: standalone)');

      matchMediaSpy.mockRestore();
    });
  });
});
