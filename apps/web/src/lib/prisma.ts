/**
 * Prisma client singleton para o Next.js web (BFF).
 *
 * **Status:** stub de build-time. O web **não deve** acessar o banco
 * diretamente — Route Handlers devem delegar ao NestJS API (apps/api)
 * via `apiClient.fetch()`. Os 2 arquivos em
 * `apps/web/src/app/api/{auth/register-with-referral,webhooks/asaas}/route.ts`
 * foram escritos antes dessa decisão arquitetural e ainda importam
 * `prisma` daqui.
 *
 * Para que o Turbopack build não quebre com 'Module not found', este
 * arquivo existe como stub. Em runtime, qualquer acesso vai jogar
 * erro claro apontando que a rota deve ser movida para apps/api.
 *
 * Quando as rotas forem migradas:
 * 1. Apagar este arquivo
 * 2. Atualizar imports nos routes para usar `@pedi-ai/api` ou
 *    `apiClient` (lib/api-client.ts)
 * 3. Atualizar testes E2E que dependem desses endpoints
 *
 * @see apps/web/src/app/api/auth/register-with-referral/route.ts
 * @see apps/web/src/app/api/webhooks/asaas/route.ts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = new Proxy(
  {},
  {
    get() {
      throw new Error(
        '[apps/web] Acesso direto a Prisma não é suportado. ' +
          'Mova o Route Handler para apps/api (NestJS) e use apiClient.fetch(). ' +
          'Stub em src/lib/prisma.ts existe apenas para satisfazer o build.'
      );
    },
  }
);
