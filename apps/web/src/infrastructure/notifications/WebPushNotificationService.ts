import {
  IPushNotificationService,
  PushNotificationPayload,
  PushPermissionState,
  PushSubscriptionVO,
} from '@/domain/notifications/IPushNotificationService';

/**
 * Implementação de `IPushNotificationService` usando a Web Push API nativa
 * do navegador + Service Worker.
 *
 * Fluxo (RF-ORDER-13):
 *  1. Cliente chama `solicitarPermissao()` — browser exibe prompt nativo.
 *  2. Se granted, `registrar()` cria uma `PushSubscription` via service worker.
 *  3. Subscription é serializada e enviada ao backend (responsabilidade do
 *     use case de pedido). Backend armazena e dispara push em eventos
 *     relevantes (ex.: status mudou para "PRONTO").
 *  4. Service worker (`sw.js`) recebe o push e exibe `Notification` nativa.
 *  5. Clique na notificação abre a URL em `data.url` ou `/pedido/{id}`.
 *
 * @spec(RF-ORDER-13)
 * @see .openspec/specs/pedido/design.md
 */
export class WebPushNotificationService implements IPushNotificationService {
  /**
   * @inheritdoc
   */
  isSuportado(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.serviceWorker !== 'undefined' &&
      typeof window.PushManager !== 'undefined' &&
      typeof window.Notification !== 'undefined'
    );
  }

  /**
   * @inheritdoc
   */
  obterPermissao(): PushPermissionState {
    if (!this.isSuportado()) return 'unsupported';
    return Notification.permission as PushPermissionState;
  }

  /**
   * @inheritdoc
   */
  async solicitarPermissao(): Promise<boolean> {
    if (!this.isSuportado()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  /**
   * @inheritdoc
   */
  async registrar(): Promise<PushSubscriptionVO | null> {
    if (!this.isSuportado()) return null;
    const temPermissao = await this.solicitarPermissao();
    if (!temPermissao) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      // Se já existe subscription, retorna ela (idempotência)
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        // applicationServerKey é opcional — backend pode configurar VAPID
        // separadamente; sem key, ainda é possível usar `mostrarNotificacaoLocal`
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
        });
      }
      return PushSubscriptionVO.fromBrowserSubscription(subscription);
    } catch (err) {
      console.error('[Push] Falha ao registrar subscription:', err);
      return null;
    }
  }

  /**
   * @inheritdoc
   */
  async cancelar(): Promise<boolean> {
    if (!this.isSuportado()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return true;
      return await subscription.unsubscribe();
    } catch (err) {
      console.error('[Push] Falha ao cancelar subscription:', err);
      return false;
    }
  }

  /**
   * @inheritdoc
   */
  async mostrarNotificacaoLocal(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSuportado()) return;
    if (Notification.permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icon-192.png',
      badge: '/badge-72.png',
      tag: payload.tag,
      data: { url: payload.url },
      requireInteraction: false,
      // @ts-expect-error - vibrate é válido mas typings podem não incluir
      vibrate: [200, 100, 200],
    });
  }
}

/**
 * Handler de clique em notificação — registrado pelo app no carregamento.
 * Faz fallback gracioso se SW não estiver disponível.
 *
 * @spec(RF-ORDER-13)
 */
export function configurarClickHandler(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'notification-click' && event.data?.url) {
      window.open(event.data.url, '_blank');
    }
  });
}
