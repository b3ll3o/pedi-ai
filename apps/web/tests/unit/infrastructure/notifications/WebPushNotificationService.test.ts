/**
 * Cobertura: RF-ORDER-13 (Notificações push via Web Push API)
 * @see .openspec/specs/pedido/design.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PushSubscriptionVO } from '@/domain/notifications/IPushNotificationService';
import { WebPushNotificationService } from '@/infrastructure/notifications/WebPushNotificationService';

/**
 * Helpers para mockar APIs do navegador (Notification, ServiceWorker,
 * PushManager) em ambiente de teste (vitest + jsdom).
 */

function mockBrowserApi(opts: {
  permission: NotificationPermission;
  hasServiceWorker?: boolean;
  hasPushManager?: boolean;
  hasNotification?: boolean;
}) {
  const hasSW = opts.hasServiceWorker ?? true;
  const hasPM = opts.hasPushManager ?? true;
  const hasNotif = opts.hasNotification ?? true;

  // 1) Mock Notification (global)
  if (hasNotif) {
    class MockNotification {
      title: string;
      body?: string;
      icon?: string;
      tag?: string;
      data?: any;
      close = vi.fn();
      constructor(title: string, options?: any) {
        this.title = title;
        this.body = options?.body;
        this.icon = options?.icon;
        this.tag = options?.tag;
        this.data = options?.data;
      }
      static permission: NotificationPermission = opts.permission;
      static requestPermission = vi.fn().mockResolvedValue(opts.permission);
    }
    (MockNotification as any).permission = opts.permission;
    (MockNotification as any).requestPermission = vi.fn().mockResolvedValue(opts.permission);
    (global as any).Notification = MockNotification;
  } else {
    (global as any).Notification = undefined;
  }

  // 2) Mock PushManager
  (global as any).PushManager = hasPM ? function () {} : undefined;

  // 3) Mock navigator.serviceWorker
  const mockNavigator: any = { ...((global as any).navigator ?? {}) };
  if (hasSW) {
    mockNavigator.serviceWorker = {
      ready: Promise.resolve({
        pushManager: hasPM
          ? {
              getSubscription: vi.fn().mockResolvedValue(null),
              subscribe: vi.fn().mockImplementation(async () => createMockBrowserSub()),
            }
          : undefined,
        showNotification: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn(),
      }),
      addEventListener: vi.fn(),
    };
  } else {
    delete mockNavigator.serviceWorker;
  }
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    configurable: true,
    writable: true,
  });
}

function createMockBrowserSub() {
  return {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    expirationTime: null,
    keys: {
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7Ihb8xZIUGdyDI',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON() {
      return {
        endpoint: this.endpoint,
        expirationTime: this.expirationTime,
        keys: this.keys,
      };
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error - cleanup
  delete (global as any).Notification;
  // @ts-expect-error - cleanup
  delete (global as any).navigator;
  // @ts-expect-error - cleanup
  delete (global as any).PushManager;
});

describe('WebPushNotificationService (RF-ORDER-13)', () => {
  let service: WebPushNotificationService;

  describe('isSuportado', () => {
    it('deve retornar true quando navegador tem todas as APIs', () => {
      mockBrowserApi({ permission: 'default' });
      service = new WebPushNotificationService();
      expect(service.isSuportado()).toBe(true);
    });

    it('deve retornar false quando ServiceWorker não existe', () => {
      mockBrowserApi({ permission: 'default', hasServiceWorker: false });
      service = new WebPushNotificationService();
      expect(service.isSuportado()).toBe(false);
    });

    it('deve retornar false quando PushManager não existe', () => {
      mockBrowserApi({ permission: 'default', hasPushManager: false });
      service = new WebPushNotificationService();
      expect(service.isSuportado()).toBe(false);
    });

    it('deve retornar false quando Notification não existe', () => {
      mockBrowserApi({ permission: 'default', hasNotification: false });
      service = new WebPushNotificationService();
      expect(service.isSuportado()).toBe(false);
    });
  });

  describe('obterPermissao', () => {
    it('deve retornar "granted" quando permitido', () => {
      mockBrowserApi({ permission: 'granted' });
      service = new WebPushNotificationService();
      expect(service.obterPermissao()).toBe('granted');
    });

    it('deve retornar "denied" quando negado', () => {
      mockBrowserApi({ permission: 'denied' });
      service = new WebPushNotificationService();
      expect(service.obterPermissao()).toBe('denied');
    });

    it('deve retornar "default" para estado inicial', () => {
      mockBrowserApi({ permission: 'default' });
      service = new WebPushNotificationService();
      expect(service.obterPermissao()).toBe('default');
    });

    it('deve retornar "unsupported" quando API não existe', () => {
      mockBrowserApi({ permission: 'default', hasNotification: false });
      service = new WebPushNotificationService();
      expect(service.obterPermissao()).toBe('unsupported');
    });
  });

  describe('solicitarPermissao', () => {
    it('deve retornar true quando usuário concede', async () => {
      mockBrowserApi({ permission: 'default' });
      service = new WebPushNotificationService();
      // requestPermission mockado retorna 'default' por padrão neste teste
      // (para simular "granted", troque o mock)
      Object.defineProperty(Notification, 'requestPermission', {
        value: vi.fn().mockResolvedValue('granted'),
        configurable: true,
        writable: true,
      });
      const result = await service.solicitarPermissao();
      expect(result).toBe(true);
    });

    it('deve retornar true se já granted', async () => {
      mockBrowserApi({ permission: 'granted' });
      service = new WebPushNotificationService();
      const result = await service.solicitarPermissao();
      expect(result).toBe(true);
    });

    it('deve retornar false se denied', async () => {
      mockBrowserApi({ permission: 'denied' });
      service = new WebPushNotificationService();
      const result = await service.solicitarPermissao();
      expect(result).toBe(false);
    });

    it('deve retornar false quando API não suportada', async () => {
      mockBrowserApi({ permission: 'default', hasPushManager: false });
      service = new WebPushNotificationService();
      const result = await service.solicitarPermissao();
      expect(result).toBe(false);
    });
  });

  describe('registrar', () => {
    it('deve criar subscription quando permissão granted', async () => {
      mockBrowserApi({ permission: 'granted' });
      service = new WebPushNotificationService();
      const sub = await service.registrar();
      expect(sub).not.toBeNull();
      expect(sub?.endpoint).toContain('fcm.googleapis.com');
      expect(sub?.props.keys.p256dh).toBeDefined();
      expect(sub?.props.keys.auth).toBeDefined();
    });

    it('deve retornar subscription existente (idempotência)', async () => {
      mockBrowserApi({ permission: 'granted' });
      // sobrescrever getSubscription para retornar uma existente
      const existingSub = createMockBrowserSub();
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            ready: Promise.resolve({
              pushManager: {
                getSubscription: vi.fn().mockResolvedValue(existingSub),
                subscribe: vi.fn(),
              },
              showNotification: vi.fn().mockResolvedValue(undefined),
              addEventListener: vi.fn(),
            }),
            addEventListener: vi.fn(),
          },
        },
        configurable: true,
        writable: true,
      });
      service = new WebPushNotificationService();
      const sub = await service.registrar();
      expect(sub?.endpoint).toBe(existingSub.endpoint);
    });

    it('deve retornar null se permissão negada', async () => {
      mockBrowserApi({ permission: 'denied' });
      service = new WebPushNotificationService();
      const sub = await service.registrar();
      expect(sub).toBeNull();
    });

    it('deve retornar null se API não suportada', async () => {
      mockBrowserApi({ permission: 'granted', hasPushManager: false });
      service = new WebPushNotificationService();
      const sub = await service.registrar();
      expect(sub).toBeNull();
    });
  });

  describe('cancelar', () => {
    it('deve retornar true quando cancela subscription existente', async () => {
      const unsubscribe = vi.fn().mockResolvedValue(true);
      const existingSub = { ...createMockBrowserSub(), unsubscribe };
      mockBrowserApi({ permission: 'granted' });
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            ready: Promise.resolve({
              pushManager: {
                getSubscription: vi.fn().mockResolvedValue(existingSub),
                subscribe: vi.fn(),
              },
              showNotification: vi.fn().mockResolvedValue(undefined),
              addEventListener: vi.fn(),
            }),
            addEventListener: vi.fn(),
          },
        },
        configurable: true,
        writable: true,
      });
      service = new WebPushNotificationService();
      const result = await service.cancelar();
      expect(result).toBe(true);
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('deve retornar true se não há subscription', async () => {
      mockBrowserApi({ permission: 'granted' });
      service = new WebPushNotificationService();
      const result = await service.cancelar();
      expect(result).toBe(true);
    });

    it('deve retornar false se API não suportada', async () => {
      mockBrowserApi({ permission: 'granted', hasPushManager: false });
      service = new WebPushNotificationService();
      const result = await service.cancelar();
      expect(result).toBe(false);
    });
  });

  describe('mostrarNotificacaoLocal', () => {
    it('deve exibir notificação quando permitido', async () => {
      mockBrowserApi({ permission: 'granted' });
      service = new WebPushNotificationService();
      const showNotification = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            ready: Promise.resolve({
              pushManager: {
                getSubscription: vi.fn().mockResolvedValue(null),
                subscribe: vi.fn(),
              },
              showNotification,
              addEventListener: vi.fn(),
            }),
            addEventListener: vi.fn(),
          },
        },
        configurable: true,
        writable: true,
      });
      await service.mostrarNotificacaoLocal({
        title: 'Pedido pronto!',
        body: 'Seu X-Burger está pronto',
        url: '/pedido/123',
        tag: 'pedido-123',
      });
      expect(showNotification).toHaveBeenCalledWith(
        'Pedido pronto!',
        expect.objectContaining({
          body: 'Seu X-Burger está pronto',
          tag: 'pedido-123',
          data: { url: '/pedido/123' },
        })
      );
    });

    it('não deve exibir quando permissão não é granted', async () => {
      mockBrowserApi({ permission: 'denied' });
      service = new WebPushNotificationService();
      await expect(service.mostrarNotificacaoLocal({ title: 'x' })).resolves.toBeUndefined();
    });
  });
});

describe('PushSubscriptionVO', () => {
  it('deve serializar para JSON e reconstruir', () => {
    const original = new PushSubscriptionVO({
      endpoint: 'https://example.com/sub/abc',
      expirationTime: null,
      keys: { p256dh: 'pub-key', auth: 'auth-secret' },
    });
    const json = original.toJSON();
    const restored = PushSubscriptionVO.fromJSON(json);
    expect(restored.endpoint).toBe(original.endpoint);
    expect(restored.props.keys).toEqual(original.props.keys);
  });

  it('deve comparar por endpoint', () => {
    const sub1 = new PushSubscriptionVO({
      endpoint: 'https://a',
      expirationTime: null,
      keys: { p256dh: 'x', auth: 'y' },
    });
    const sub2 = new PushSubscriptionVO({
      endpoint: 'https://a',
      expirationTime: null,
      keys: { p256dh: 'z', auth: 'w' },
    });
    const sub3 = new PushSubscriptionVO({
      endpoint: 'https://b',
      expirationTime: null,
      keys: { p256dh: 'x', auth: 'y' },
    });
    expect(sub1.equals(sub2)).toBe(true);
    expect(sub1.equals(sub3)).toBe(false);
  });
});
