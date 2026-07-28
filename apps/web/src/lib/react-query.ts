/**
 * Singleton QueryClient para o pedi-ai.
 *
 * Por que singleton? Em SSR + Next.js App Router, cada request cria um
 * escopo novo. Sem singleton, dois componentes que chamam `getQueryClient()`
 * receberiam instâncias diferentes e perderiam o cache compartilhado.
 *
 * Padrão recomendado pela própria documentação do TanStack Query:
 * https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 *
 * Uso típico em Server Components:
 *   const qc = getQueryClient();
 *   await qc.prefetchQuery({ queryKey: ['menu'], queryFn: fetchMenu });
 */
import { QueryClient } from '@tanstack/react-query';

let browserClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: sempre uma instância nova (sem compartilhamento entre requests).
    return makeClient();
  }
  // Browser: singleton por aba/janela.
  if (!browserClient) {
    browserClient = makeClient();
  }
  return browserClient;
}

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
