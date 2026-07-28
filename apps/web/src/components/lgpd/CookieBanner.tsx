'use client';

/**
 * Cookie Banner LGPD
 *
 * **POR QUE precisamos dele?**
 * - LGPD Art. 7º exige consentimento para cookies NÃO estritamente necessários.
 * - PediAI usa APENAS cookies essenciais (auth + cart) → **não precisa** de banner funcional.
 * - Este componente existe apenas para informar o usuário sobre os cookies em uso
 *   e cumprir o **princípio de transparência** (LGPD Art. 9º).
 *
 * **Como funciona:**
 * - Mostra uma vez (persistido em `localStorage` com flag `pedi_cookie_banner_dismissed`).
 * - Tem link para `/privacidade` (política completa).
 * - NÃO bloqueia a experiência (não exige interação).
 * - Botão "Entendi" fecha e nunca mais aparece.
 *
 * **Por que NÃO usamos cookies de marketing/analytics:**
 * - Plausible é cookie-less (dispensa consentimento, conforme ANPD).
 * - Sentry não usa cookies no client.
 * - Não temos ads.
 *
 * Referência LGPD: https://www.gov.br/anpd/pt-br
 */

import { useLocalStorageState } from '@/hooks/useLocalStorageState';

import styles from './CookieBanner.module.css';

const STORAGE_VERSION = '1'; // Incrementar se mudar copy/material

interface CookieBannerState {
  dismissed: boolean;
  version: string | null;
  dismissedAt?: string;
}

/**
 * Componente que renderiza o banner informativo de cookies.
 *
 * Aparece apenas uma vez por usuário (persistido em localStorage).
 * Não é bloqueante — usuário pode fechar a qualquer momento.
 */
export function CookieBanner() {
  const [stored, setStored] = useLocalStorageState<CookieBannerState | null>(
    'cookie_banner_dismissed',
    null,
    STORAGE_VERSION
  );

  const isDismissed = stored?.dismissed === true && stored?.version === STORAGE_VERSION;

  const handleDismiss = () => {
    setStored({
      dismissed: true,
      version: STORAGE_VERSION,
      dismissedAt: new Date().toISOString(),
    });
  };

  // Não renderiza se já dismissed.
  if (isDismissed) return null;

  return (
    <div role="dialog" aria-live="polite" aria-label="Aviso de cookies" className={styles.banner}>
      <div className={styles.content}>
        <p className={styles.text}>
          🍪 Usamos apenas cookies essenciais para login e carrinho.{' '}
          <strong>Não usamos cookies de marketing ou rastreamento.</strong> Saiba mais em nossa{' '}
          <a href="/privacidade" className={styles.link}>
            Política de Privacidade
          </a>
          .
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className={styles.button}
          aria-label="Fechar aviso de cookies"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
