/**
 * Página Admin: /admin/indicacao
 *
 * Onde o dono vê e compartilha seu link de indicação.
 */

import { ReferralPanel } from '@/components/referral/ReferralPanel';

export const metadata = {
  title: 'Indicação | PediAI',
  description: 'Indique amigos e ganhe meses grátis no PediAI',
};

export default function ReferralPage() {
  return (
    <main
      data-testid="pedi-referral-page"
      className="mx-auto max-w-4xl space-y-6 p-6"
    >
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Programa de Indicação</h1>
        <p className="mt-2 text-gray-600">
          Indique amigos donos de restaurante e ganhe meses grátis no PediAI.
        </p>
      </header>

      <ReferralPanel />
    </main>
  );
}