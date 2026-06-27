# @pedi-ai/feature-flags

SDK compartilhado de Feature Flags para o Pedi-AI. Fornece:

- `FeatureFlagClient` — cliente independente de framework para avaliação de flags
  (polling, ETag, fallback). Pode rodar no browser ou no Node (testes).
- `FeatureFlagProvider` + hooks React (`useFeatureFlag`, `useFeatureFlags`,
  `useFeatureFlagClient`, `useFeatureFlagSnapshot`) — camada fina de reatividade
  sobre o client.
- Tipos (`FlagValue`, `EvaluationContext`, `FeatureFlagClientConfig`, etc.).

## Instalação

Já é parte do monorepo. Para usar em `apps/web`:

```json
"dependencies": {
  "@pedi-ai/feature-flags": "workspace:*"
}
```

## Uso básico

```tsx
'use client';
import { FeatureFlagClient, FeatureFlagProvider, useFeatureFlag } from '@pedi-ai/feature-flags';

const client = new FeatureFlagClient({
  baseUrl: '/api/v1/admin/feature-flags',
  pollIntervalMs: 30_000,
});

export function App({ children }) {
  return (
    <FeatureFlagProvider client={client}>
      <PixButton />
      {children}
    </FeatureFlagProvider>
  );
}

function PixButton() {
  const pixEnabled = useFeatureFlag<boolean>('pix_enabled', false);
  if (!pixEnabled) return null;
  return <button>Pagar com PIX</button>;
}
```

## Subpath exports

- `@pedi-ai/feature-flags` — API completa (tipos, client, provider, hooks).
- `@pedi-ai/feature-flags/client` — apenas `FeatureFlagClient` (server-safe).
- `@pedi-ai/feature-flags/provider` — apenas `FeatureFlagProvider` + hooks (client-only).

## Princípios

- Sem dependência de React no `FeatureFlagClient` — Provider é camada fina.
- Idempotente: `start()` pode ser chamado várias vezes sem duplicar timers.
- SSR-safe: o client só roda em browser. Use `initialSnapshot` para pré-hidratar.
- Fallback gracioso: se rede falhar, retorna valor passado em `evaluate(keys, ctx, fallback)`.

## Specs relacionadas

- `RF-ADM-FF-08` — Avaliação via backend com ETag.
- `RF-ADM-FF-10` — Painel admin de feature flags.
- `RNF-PERF-FF-01` — Polling 30s.
- `RNF-AVAIL-FF-01` — Degradação graciosa em falha de rede.
- `RNF-MAINT-FF-01` — Paridade de tipos front/back.
