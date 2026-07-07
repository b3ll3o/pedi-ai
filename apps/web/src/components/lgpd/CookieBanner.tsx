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

import { useEffect, useState } from 'react';

import styles from './CookieBanner.module.css';

const STORAGE_KEY = 'pedi_cookie_banner_dismissed';
const STORAGE_VERSION = '1'; // Incrementar se mudar copy/material

interface CookieBannerState {
  dismissed: boolean;
  version: string | null;
}

/**
 * Componente que renderiza o banner informativo de cookies.
 *
 * Aparece apenas uma vez por usuário (persistido em localStorage).
 * Não é bloqueante — usuário pode fechar a qualquer momento.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Verifica se já foi dismissed na versão atual.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CookieBannerState = JSON.parse(raw);
        if (parsed.dismissed && parsed.version === STORAGE_VERSION) {
          setVisible(false);
          return;
        }
      }
    } catch {
      // localStorage pode falhar em modo privado ou se bloqueado.
      // Em caso de erro, mostra o banner (fail-safe).
    }
    setVisible(true);
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dismissed: true, version: STORAGE_VERSION, dismissedAt: new Date().toISOString() })
      );
    } catch {
      // Ignora erro de localStorage.
    }
    setVisible(false);
  };

  // Não renderiza no SSR (evita hydration mismatch).
  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className={styles.banner}
    >
      <div className={styles.content}>
        <p className={styles.text}>
          🍪 Usamos apenas cookies essenciais para login e carrinho.{' '}
          <strong>Não usamos cookies de marketing ou rastreamento.</strong>{' '}
          Saiba mais em nossa{' '}
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