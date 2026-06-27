'use client';

/**
 * @spec(RF-ADM-FF-10)
 *
 * Página `/admin/feature-flags` — Painel admin para gerenciar feature flags.
 *
 * Guard:
 *  - Verifica sessão via `getSession()`. Sem sessão → redirect para /admin/login.
 *  - Se sessão existe, mas role não é owner/manager → renderiza estado restrito.
 *
 * Hidratação:
 *  - Lê flags iniciais via `GET /api/v1/admin/feature-flags` (1x).
 *  - Polling 30s delegado ao `PainelFeatureFlags`.
 *  - Provider de feature flags envolvendo a árvore para hooks `useFeatureFlag`.
 */
import { FeatureFlagClient } from '@pedi-ai/feature-flags/client';
import { FeatureFlagProvider } from '@pedi-ai/feature-flags/provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PainelFeatureFlags } from '@/components/admin/feature-flags/PainelFeatureFlags';
import { getSession } from '@/lib/auth/client';

export default function FeatureFlagsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'owner' | 'manager' | null>(null);
  const [client] = useState(
    () =>
      new FeatureFlagClient({
        baseUrl: '/api/v1/admin/feature-flags',
        pollIntervalMs: 30_000,
      })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (cancelled) return;
        if (!session?.user) {
          router.replace('/admin/login');
          return;
        }
        const normalized = normalizeRole(session.user.role);
        if (!normalized) {
          router.replace('/admin');
          return;
        }
        setRole(normalized);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando…</div>;
  }

  if (!role) {
    return null;
  }

  return (
    <FeatureFlagProvider client={client}>
      <PainelFeatureFlags role={role} />
    </FeatureFlagProvider>
  );
}

function normalizeRole(input: string | undefined): 'owner' | 'manager' | null {
  if (!input) return null;
  const v = input.toLowerCase();
  if (v === 'owner' || v === 'dono') return 'owner';
  if (v === 'manager' || v === 'gerente') return 'manager';
  return null;
}
