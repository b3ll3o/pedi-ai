import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { registerServiceWorker, unregisterServiceWorker, notifyUpdate } from '@/lib/sw/register';

describe('lib/sw/register', () => {
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockUnregister: ReturnType<typeof vi.fn>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;

  const createMockRegistration = (installing?: ServiceWorker | null) => ({
    register: mockRegister.mockResolvedValue({
      ...(installing !== undefined ? { installing } : {}),
      addEventListener: mockAddEventListener,
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegister = vi.fn();
    mockUnregister = vi.fn();
    mockAddEventListener = vi.fn();
    mockConfirm = vi.fn();

    // Mock navigator.serviceWorker
    const mockServiceWorker = {
      register: mockRegister,
      unregister: mockUnregister,
      addEventListener: mockAddEventListener,
      ready: Promise.resolve({
        unregister: mockUnregister,
      }),
      controller: null,
    };

    vi.stubGlobal('navigator', {
      serviceWorker: mockServiceWorker,
    });

    vi.stubGlobal('dispatchEvent', vi.fn());
    vi.stubGlobal('confirm', mockConfirm);
    vi.stubGlobal('window', {
      location: { reload: vi.fn() },
      addEventListener: vi.fn(),
    });

    // Save original NODE_ENV
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerServiceWorker', () => {
    it('deve chamar register com /sw.js em produção', async () => {
      registerServiceWorker();

      // Aguarda o evento load disparar
      const loadHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'load'
      )?.[1];

      if (loadHandler) {
        await loadHandler();
      }

      expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    });

    it('não deve registrar service worker fora de produção', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      registerServiceWorker();

      const loadHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'load'
      )?.[1];

      if (loadHandler) {
        await loadHandler();
      }

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('não deve registrar service worker se navigator.serviceWorker não existe', async () => {
      vi.stubGlobal('navigator', {});

      registerServiceWorker();

      const loadHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'load'
      )?.[1];

      if (loadHandler) {
        await loadHandler();
      }

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('deve escutar evento updatefound quando registro succeede', async () => {
      const newWorker = { statechange: null, addEventListener: vi.fn() } as any;

      mockRegister.mockResolvedValue({
        installing: newWorker,
        addEventListener: mockAddEventListener,
      });

      registerServiceWorker();

      const loadHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'load'
      )?.[1];

      if (loadHandler) {
        await loadHandler();
      }

      // Aguarda promise do register
      await Promise.resolve();

      const updatefoundHandler = mockAddEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'updatefound'
      )?.[1];

      expect(updatefoundHandler).toBeDefined();
    });

    it('deve fazer console.error quando registro falha', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

      mockRegister.mockRejectedValue(new Error('Registration failed'));

      registerServiceWorker();

      const loadHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'load'
      )?.[1];

      if (loadHandler) {
        await loadHandler();
      }

      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SW] Registration failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('deve escutar statechange do newWorker para detectar updates', async () => {
      const newWorker = {
        statechange: null,
        addEventListener: vi.fn(),
        state: 'installing',
      } as any;

      mockRegister.mockResolvedValue({
        installing: newWorker,
        addEventListener: mockAddEventListener,
      });

      registerServiceWorker();

      const loadHandler = (window.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'load'
      )?.[1];

      if (loadHandler) {
        await loadHandler();
      }

      await Promise.resolve();

      expect(newWorker.addEventListener).toHaveBeenCalledWith(
        'statechange',
        expect.any(Function)
      );
    });

    it('deve fazer console.warn quando service workers não são suportados', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());

      vi.stubGlobal('navigator', {
        serviceWorker: undefined,
      });

      registerServiceWorker();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SW] Service workers are not supported or not in production'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('unregisterServiceWorker', () => {
    it('deve chamar unregister no service worker', async () => {
      mockUnregister.mockResolvedValue(undefined);

      unregisterServiceWorker();

      // Aguarda promise de ready
      await Promise.resolve();

      expect(mockUnregister).toHaveBeenCalled();
    });

    it('não deve lançar erro se serviceWorker não existe', async () => {
      vi.stubGlobal('navigator', {});

      expect(() => {
        unregisterServiceWorker();
      }).not.toThrow();
    });
  });

  describe('notifyUpdate', () => {
    it('deve adicionar listener para sw-update-available', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(vi.fn());

      notifyUpdate();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'sw-update-available',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('deve pedir confirmação e recarregar quando update disponível', async () => {
      mockConfirm.mockReturnValue(true);
      const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(vi.fn());
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(
        (event: string, handler: EventListener) => {
          if (event === 'sw-update-available') {
            // Simula o custom event
            (handler as any)(new CustomEvent('sw-update-available'));
          }
        }
      );

      notifyUpdate();

      await Promise.resolve();

      expect(mockConfirm).toHaveBeenCalledWith(
        'A new version is available. Reload to update?'
      );
      expect(reloadSpy).toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
      reloadSpy.mockRestore();
    });

    it('não deve recarregar se usuário recusar confirmação', async () => {
      mockConfirm.mockReturnValue(false);
      const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(vi.fn());
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation(
        (event: string, handler: EventListener) => {
          if (event === 'sw-update-available') {
            (handler as any)(new CustomEvent('sw-update-available'));
          }
        }
      );

      notifyUpdate();

      await Promise.resolve();

      expect(mockConfirm).toHaveBeenCalled();
      expect(reloadSpy).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
      reloadSpy.mockRestore();
    });
  });
});
