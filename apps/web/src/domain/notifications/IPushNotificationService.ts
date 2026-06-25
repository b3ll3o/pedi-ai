/**
 * Value Object representando uma inscrição push do cliente.
 * @spec(RF-ORDER-13)
 */
export interface PushSubscriptionProps {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushSubscriptionVO {
  constructor(public readonly props: PushSubscriptionProps) {}

  get endpoint(): string {
    return this.props.endpoint;
  }

  get keys(): PushSubscriptionProps['keys'] {
    return this.props.keys;
  }

  /**
   * Serializa para JSON (formato esperado pelo backend).
   */
  toJSON(): PushSubscriptionProps {
    return { ...this.props };
  }

  /**
   * Reconstrói a partir de JSON.
   */
  static fromJSON(json: PushSubscriptionProps): PushSubscriptionVO {
    return new PushSubscriptionVO(json);
  }

  /**
   * Reconstrói a partir de uma PushSubscription do navegador.
   */
  static fromBrowserSubscription(sub: globalThis.PushSubscription): PushSubscriptionVO {
    const json = sub.toJSON() as {
      endpoint: string;
      expirationTime: number | null;
      keys: { p256dh: string; auth: string };
    };
    return new PushSubscriptionVO(json);
  }

  /**
   * Verifica igualdade básica (por endpoint).
   */
  equals(other: PushSubscriptionVO): boolean {
    return this.props.endpoint === other.props.endpoint;
  }
}

/**
 * Payload de notificação a ser exibida.
 */
export interface PushNotificationPayload {
  title: string;
  body?: string;
  /**
   * URL opcional para abrir quando o usuário clicar.
   */
  url?: string;
  /**
   * Ícone (URL ou caminho relativo).
   */
  icon?: string;
  /**
   * Tag — notifications com mesma tag substituem a anterior.
   */
  tag?: string;
}

/**
 * Status da inscrição push.
 */
export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Interface para o serviço de notificações push (Web Push API).
 *
 * Implementação fica em `infrastructure/notifications/`.
 *
 * @spec(RF-ORDER-13)
 * @see .openspec/specs/pedido/design.md
 */
export interface IPushNotificationService {
  /**
   * Verifica se o navegador suporta Web Push API.
   */
  isSuportado(): boolean;

  /**
   * Retorna o estado atual de permissão.
   */
  obterPermissao(): PushPermissionState;

  /**
   * Solicita permissão ao usuário. Retorna true se concedida.
   */
  solicitarPermissao(): Promise<boolean>;

  /**
   * Registra a inscrição push no navegador (se houver permissão).
   * Retorna null se não for possível registrar.
   */
  registrar(): Promise<PushSubscriptionVO | null>;

  /**
   * Remove a inscrição atual.
   */
  cancelar(): Promise<boolean>;

  /**
   * Exibe uma notificação local (foreground) sem precisar de push do servidor.
   * Útil para feedback imediato.
   */
  mostrarNotificacaoLocal(payload: PushNotificationPayload): Promise<void>;
}
