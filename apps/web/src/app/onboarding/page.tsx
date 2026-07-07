'use client';

/**
 * Onboarding Wizard — Página principal
 *
 * Wizard de 4 passos que guia o novo dono de restaurante a configurar
 * sua loja em ~5 minutos.
 *
 * **Steps:**
 * 1. Escolha da vertical (com templates de cardápio prontos)
 * 2. Dados básicos do restaurante (nome, CNPJ, endereço)
 * 3. Confirmação do template (preview + edita)
 * 4. Sucesso + link pro painel
 *
 * **Estado:**
 * Mantido em `useState` local (sem backend). Persiste em `localStorage`
 * pra sobreviver a refresh.
 *
 * **Tracking:**
 * Cada step dispara evento Plausible pra analytics de funil.
 */

import { useEffect, useState } from 'react';

import { trackEvent, PlausibleEvents } from '@/types/plausible';
import { getVerticaisMetadata, type VerticalSlug } from '@/lib/onboarding/templates';

import { VerticalStep } from '@/components/onboarding/VerticalStep';

const STORAGE_KEY = 'pedi_onboarding_state_v1';

interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  vertical: VerticalSlug | null;
  restaurantName: string;
  cnpj: string;
  address: string;
  phone: string;
}

const INITIAL_STATE: OnboardingState = {
  step: 1,
  vertical: null,
  restaurantName: '',
  cnpj: '',
  address: '',
  phone: '',
};

export default function OnboardingPage() {
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [mounted, setMounted] = useState(false);

  // Hidratação: carrega estado persistido.
  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({ ...INITIAL_STATE, ...parsed });
      }
    } catch {
      // Ignora erro de localStorage.
    }
    trackEvent(PlausibleEvents.onboardingStep.name, {
      onboardingStep: 'wizard_started',
    });
  }, []);

  // Persiste estado a cada mudança.
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignora.
    }
  }, [state, mounted]);

  const handleVerticalSelect = (slug: VerticalSlug) => {
    setState((s) => ({ ...s, vertical: slug }));
    trackEvent(PlausibleEvents.onboardingStep.name, {
      onboardingStep: `vertical_selected:${slug}`,
    });
  };

  const handleNext = () => {
    setState((s) => ({ ...s, step: Math.min(4, s.step + 1) as 1 | 2 | 3 | 4 }));
  };

  const handleBack = () => {
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as 1 | 2 | 3 | 4 }));
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <main
      data-testid="pedi-onboarding-main"
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12"
    >
      {/* Progress indicator */}
      <div className="mx-auto mb-8 max-w-3xl px-6">
        <div className="flex items-center justify-between text-sm">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`flex items-center gap-2 ${
                n === state.step ? 'font-semibold text-blue-600' : n < state.step ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  n === state.step
                    ? 'bg-blue-600 text-white'
                    : n < state.step
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200'
                }`}
              >
                {n < state.step ? '✓' : n}
              </span>
              <span className="hidden sm:inline">
                {n === 1 && 'Vertical'}
                {n === 2 && 'Dados'}
                {n === 3 && 'Template'}
                {n === 4 && 'Pronto'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      {state.step === 1 && (
        <VerticalStep
          selected={state.vertical}
          onSelect={handleVerticalSelect}
          onNext={handleNext}
          verticals={getVerticaisMetadata()}
        />
      )}

      {state.step === 2 && (
        <div className="mx-auto max-w-2xl space-y-6 rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Dados do restaurante</h1>
          <div className="space-y-4">
            <div>
              <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700">
                Nome do restaurante *
              </label>
              <input
                id="restaurantName"
                type="text"
                data-testid="pedi-onboarding-restaurant-name"
                value={state.restaurantName}
                onChange={(e) => setState((s) => ({ ...s, restaurantName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Ex: Pizzaria do Zé"
              />
            </div>
            <div>
              <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                CNPJ *
              </label>
              <input
                id="cnpj"
                type="text"
                data-testid="pedi-onboarding-cnpj"
                value={state.cnpj}
                onChange={(e) => setState((s) => ({ ...s, cnpj: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Endereço completo
              </label>
              <input
                id="address"
                type="text"
                data-testid="pedi-onboarding-address"
                value={state.address}
                onChange={(e) => setState((s) => ({ ...s, address: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefone (WhatsApp)
              </label>
              <input
                id="phone"
                type="tel"
                data-testid="pedi-onboarding-phone"
                value={state.phone}
                onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleBack}
              data-testid="pedi-onboarding-back"
              className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleNext}
              data-testid="pedi-onboarding-continue"
              disabled={!state.restaurantName || !state.cnpj}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {state.step === 3 && state.vertical && (
        <div className="mx-auto max-w-2xl space-y-6 rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Template de cardápio</h1>
          <p className="text-gray-600">
            Vamos aplicar o template de <strong data-testid="pedi-template-vertical-name">{state.vertical}</strong> com produtos
            prontos. Você pode editar tudo depois no painel.
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              ✅ Clique em <strong>Aplicar template</strong> para criar todas as categorias e
              produtos automaticamente.
            </p>
          </div>
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleBack}
              data-testid="pedi-onboarding-back"
              className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleNext}
              data-testid="pedi-onboarding-apply-template"
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Aplicar e continuar
            </button>
          </div>
        </div>
      )}

      {state.step === 4 && (
        <div
          data-testid="pedi-onboarding-success"
          className="mx-auto max-w-2xl space-y-6 rounded-xl bg-white p-8 text-center shadow-sm"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Tudo pronto!</h1>
          <p className="text-gray-600">
            Seu restaurante <strong>{state.restaurantName}</strong> foi configurado.
            Trial de 14 dias ativado.
          </p>
          <a
            href="/admin/dashboard"
            data-testid="pedi-onboarding-dashboard-link"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Acessar painel
          </a>
        </div>
      )}
    </main>
  );
}