'use client';

/**
 * Referral Panel — Componente de indicação no Admin
 *
 * Mostra:
 * - Link de indicação (compartilhável)
 * - QR Code
 * - Stats (signups, conversões, meses grátis ganhos)
 * - Botão de copiar
 * - Botão de compartilhar via WhatsApp
 *
 * Aparece em /admin/indicacao ou embeded no dashboard.
 */

import { useEffect, useState } from 'react';
import { Copy, Share2, Gift, TrendingUp, Users, Check } from 'lucide-react';

interface ReferralData {
  code: string;
  totalSignups: number;
  totalConversions: number;
  rewardCreditMonths: number;
  availableCreditMonths: number;
  shareUrl: string;
}

export function ReferralPanel() {
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchReferral = async () => {
      try {
        const response = await fetch('/api/referral/me');
        const data = await response.json();
        if (!cancelled) {
          setReferral(data.referral);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar referral:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReferral();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: prompt com texto
      window.prompt('Copie o link:', referral.shareUrl);
    }
  };

  const handleWhatsAppShare = () => {
    if (!referral) return;
    const text = encodeURIComponent(
      `Oi! Tô usando o PediAI pra gerenciar meu restaurante e tô curtindo muito. Use meu link de indicação e ganha 1 mês grátis: ${referral.shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div
        data-testid="pedi-referral-loading"
        className="rounded-xl border border-gray-200 bg-white p-6"
      >
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        Erro ao carregar dados de indicação.
      </div>
    );
  }

  return (
    <div data-testid="pedi-referral-panel" className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-600 p-3">
            <Gift className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Indique e ganhe</h2>
            <p className="mt-1 text-sm text-gray-600">
              Para cada amigo que assinar o PediAI, você ganha até <strong>3 meses grátis</strong>.
              Eles ganham <strong>1 mês grátis</strong> também.
            </p>
          </div>
        </div>
      </div>

      {/* Link de indicação */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Seu link de indicação</h3>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referral.shareUrl}
            data-testid="pedi-referral-link"
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            onClick={handleCopy}
            data-testid="pedi-referral-copy"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            aria-label="Copiar link de indicação"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copiar
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleWhatsAppShare}
            data-testid="pedi-referral-whatsapp"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            aria-label="Compartilhar via WhatsApp"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </button>
        </div>

        {/* Código curto (pra compartilhamento verbal) */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Ou compartilhe só o código:</p>
          <p
            data-testid="pedi-referral-code"
            className="mt-1 font-mono text-2xl font-bold tracking-wider text-gray-900"
          >
            {referral.code}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          data-testid="pedi-referral-stat-signups"
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <span className="text-sm text-gray-600">Cadastros</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{referral.totalSignups}</p>
          <p className="mt-1 text-xs text-gray-500">pessoas se cadastraram</p>
        </div>

        <div
          data-testid="pedi-referral-stat-conversions"
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" aria-hidden="true" />
            <span className="text-sm text-gray-600">Conversões</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{referral.totalConversions}</p>
          <p className="mt-1 text-xs text-gray-500">viraram assinantes</p>
        </div>

        <div
          data-testid="pedi-referral-stat-credit"
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-purple-600" aria-hidden="true" />
            <span className="text-sm text-gray-600">Meses grátis</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {referral.availableCreditMonths}
            <span className="ml-2 text-base font-normal text-gray-400">
              / {referral.rewardCreditMonths}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {referral.availableCreditMonths > 0 ? 'Disponível pra usar' : 'Ganhe mais indicando'}
          </p>
        </div>
      </div>

      {/* Como funciona */}
      <details className="rounded-xl border border-gray-200 bg-white p-6">
        <summary className="cursor-pointer text-sm font-semibold text-gray-700">
          Como funciona?
        </summary>
        <ol className="mt-4 space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              1
            </span>
            Compartilhe seu link com amigos donos de restaurante
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              2
            </span>
            Eles se cadastram pelo link e ganham <strong>1 mês grátis</strong>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              3
            </span>
            Quando assinam o primeiro mês, você ganha <strong>até 3 meses grátis</strong> acumulados
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              4
            </span>
            O desconto aparece automaticamente nas próximas faturas
          </li>
        </ol>
      </details>
    </div>
  );
}
