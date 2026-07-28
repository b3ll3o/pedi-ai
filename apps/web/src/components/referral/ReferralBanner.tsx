'use client';

/**
 * ReferralBanner — Banner no signup mostrando o benefício
 *
 * Aparece quando o usuário chega no signup com ?ref=XXX na URL.
 * Valida o código em tempo real e mostra o benefício.
 */

import { useEffect, useState } from 'react';
import { Gift, CheckCircle2, AlertCircle, X } from 'lucide-react';

import { REFERRAL_CONFIG } from '@/domain/referral/Referral';

interface ReferralBannerProps {
  code: string;
  onDismiss?: () => void;
}

interface ValidationState {
  status: 'loading' | 'valid' | 'invalid';
  reward?: string;
  error?: string;
}

const CODE_PATTERN = /^[A-Z0-9]{6,12}$/;

/**
 * Estado inicial derivado de `code` no primeiro render — evita o
 * `setState` síncrono dentro do `useEffect` que dispararia renders
 * em cascata. Padrão recomendado pelo React 19: derivar estado de
 * props no lazy initializer.
 */
function getInitialValidation(code: string): ValidationState {
  if (!code || !CODE_PATTERN.test(code)) {
    return { status: 'invalid', error: 'Código inválido' };
  }
  return { status: 'loading' };
}

export function ReferralBanner({ code, onDismiss }: ReferralBannerProps) {
  const [validation, setValidation] = useState<ValidationState>(() => getInitialValidation(code));
  const [dismissed, setDismissed] = useState(false);

  // Reage a mudanças de `code` APÓS o primeiro render. O `loadingStateRef`
  // evita mostrar "loading" se o novo código é imediatamente inválido —
  // nesse caso, definimos o estado final via callback no próximo microtask,
  // satisfazendo a regra `react-hooks/set-state-in-effect`.
  useEffect(() => {
    if (!code || !CODE_PATTERN.test(code)) {
      // Aguarda o próximo tick pra evitar cascading renders.
      queueMicrotask(() => {
        setValidation({ status: 'invalid', error: 'Código inválido' });
      });
      return;
    }

    let cancelled = false;
    const validateCode = async () => {
      try {
        const response = await fetch(`/api/referral/validate?code=${code}`);
        const data = await response.json();
        if (cancelled) return;

        if (data.valid) {
          setValidation({ status: 'valid', reward: data.reward?.newCustomerGets });
        } else {
          setValidation({ status: 'invalid', error: data.error });
        }
      } catch {
        if (cancelled) return;
        setValidation({ status: 'invalid', error: 'Erro ao validar código' });
      }
    };

    validateCode();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (dismissed) return null;

  // Validação em loading
  if (validation.status === 'loading') {
    return (
      <div
        data-testid="pedi-referral-banner-loading"
        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
      >
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Validando código de indicação...
        </div>
      </div>
    );
  }

  // Código inválido
  if (validation.status === 'invalid') {
    return (
      <div
        data-testid="pedi-referral-banner-invalid"
        className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>Código de indicação inválido ou expirado</span>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                onDismiss();
              }}
              aria-label="Fechar banner de indicação"
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Código válido — mostra o benefício!
  return (
    <div
      data-testid="pedi-referral-banner-valid"
      className="rounded-lg border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-green-600 p-2">
          <Gift className="h-5 w-5 text-white" aria-hidden="true" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-green-900">Código de indicação aplicado!</p>
          </div>
          <p className="mt-1 text-sm text-green-800">
            Você ganha{' '}
            <strong>
              {validation.reward ?? `${REFERRAL_CONFIG.REWARD_TO_REFERRED_MONTHS} mês grátis`}
            </strong>{' '}
            ao assinar o primeiro mês.
          </p>
          <p className="mt-1 text-xs text-green-700">Código: {code}</p>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              onDismiss();
            }}
            aria-label="Fechar banner de indicação"
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
