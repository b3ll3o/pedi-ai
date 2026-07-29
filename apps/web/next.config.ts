import { randomBytes } from 'crypto';

import type { NextConfig } from 'next';

/**
 * Configuração Next.js com headers de segurança obrigatórios.
 *
 * Headers aplicados em todas as rotas (`/(.*)`):
 * - `X-Content-Type-Options: nosniff` — previne MIME sniffing.
 * - `X-Frame-Options: DENY` — previne clickjacking.
 * - `Referrer-Policy: strict-origin-when-cross-origin` — limita vazamento de paths internos.
 * - `Permissions-Policy` — desabilita APIs sensíveis (geolocation, camera, mic).
 * - `Strict-Transport-Security` — força HTTPS em produção.
 * - `Content-Security-Policy` — mitiga XSS via injeção de scripts.
 *
 * ## CSP nonce (H11)
 *
 * `script-src` aceita `'nonce-<base64>'` ao invés de `'unsafe-inline'`.
 * O nonce é gerado por request via `headers()` (`request.headers` é
 * injetado pelo Next runtime) e lido pelos helpers de RSC para marcar
 * scripts inline como confiáveis. Sem isso, qualquer XSS que injete
 * `<script>alert(1)</script>` passaria pela CSP atual.
 *
 * Por que `unsafe-inline` ainda aparece em `style-src`? Estilos inline
 * (`<style>` de páginas RSC, CSS-in-JS legado) precisam de
 * `unsafe-inline` ou hashes/nonces correspondentes. Migrar estilos
 * para nonces exige instrumentar cada `<style>` gerado, fora de escopo
 * aqui. Para `script-src` (mais sensível a XSS) já temos nonce.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

/**
 * Gera nonce CSP por request. Base64 de 16 bytes é o padrão do Next.js
 * para nonces (mesmo formato que `useServerInsertedHTML`).
 */
function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

/**
 * Constrói `images.remotePatterns` a partir de variáveis de ambiente.
 *
 * `NEXT_PUBLIC_CDN_URL` é a URL completa do CDN (ex.: `https://cdn.pedi-ai.com`).
 * Aceita múltiplas URLs separadas por vírgula para CDN primário + fallback.
 * `NEXT_PUBLIC_IMAGE_HOSTNAMES` permite listar hostnames extras sem URL completa
 * (ex.: `images.weserv.nl,cdn.jsdelivr.net`).
 *
 * Sem envs configuradas, `remotePatterns` fica vazio e `next/image` recusa
 * carregar URLs externas (mensagem clara no console em vez de placeholder
 * silencioso).
 */
function buildImageRemotePatterns(): Array<{
  protocol: 'http' | 'https';
  hostname: string;
  pathname?: string;
}> {
  const patterns: Array<{ protocol: 'http' | 'https'; hostname: string; pathname?: string }> = [];
  const seen = new Set<string>();

  const pushFromUrl = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      const key = `${parsed.protocol}//${parsed.hostname}`;
      if (seen.has(key)) return;
      seen.add(key);
      patterns.push({
        protocol: parsed.protocol === 'http:' ? 'http' : 'https',
        hostname: parsed.hostname,
      });
    } catch {
      // URL inválida — ignora silenciosamente (env pode estar malformada
      // durante dev). O log de erro do Next será emitido na primeira
      // tentativa de carregar a imagem.
    }
  };

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl) {
    cdnUrl.split(',').forEach((u) => u.trim() && pushFromUrl(u));
  }

  const extraHostnames = process.env.NEXT_PUBLIC_IMAGE_HOSTNAMES;
  if (extraHostnames) {
    extraHostnames.split(',').forEach((h) => {
      const trimmed = h.trim();
      if (!trimmed) return;
      const key = `https://${trimmed}`;
      if (seen.has(key)) return;
      seen.add(key);
      patterns.push({ protocol: 'https', hostname: trimmed });
    });
  }

  return patterns;
}

const nextConfig: NextConfig = {
  // Web Vitals Attribution — habilita `reportWebVitals` no Next.js
  // para captura de LCP/INP/CLS/TTFB/FID. OBSERVABILITY.md § P0.4.
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP', 'INP', 'TTFB', 'FID'],
  },
  // TypeScript build errors são bloqueantes. Os erros pré-existentes foram
  // resolvidos (mapeamento de campos pt-BR do domínio, anotações de
  // generics em api-client wrappers, conversão Buffer em QRCodeVisual).
  // Manter `ignoreBuildErrors: false` para que novos erros não passem
  // despercebidos em CI.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Pacotes workspace transpilados pelo Next para garantir que JSX/TSX
  // sejam processados (alguns bundlers não processam sources em
  // workspaces sem essa diretiva).
  transpilePackages: ['@pedi-ai/feature-flags', '@pedi-ai/shared'],
  serverExternalPackages: ['postgres'],
  // Sentry Instrumentation Hooks (auditoria P1-1):
  // - Sentry.server.config.ts → captura erros Node.js (Route Handlers, Server Components)
  // - Sentry.edge.config.ts → captura erros Edge (Middleware, proxy.ts)
  // - Sentry.client.config.ts → carregado automaticamente via <script> injetado pelo SDK
  //
  // O Next.js 15+ detecta `src/instrumentation.ts` automaticamente — não
  // precisa mais de `experimental.instrumentationHook: true` (deprecated).
  // Mantemos a chamada `await import('./sentry.*.config')` em `register()`
  // condicionada ao NEXT_RUNTIME para não rodar o código de edge em Node
  // (e vice-versa).
  allowedDevOrigins: ['192.168.0.181', '192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'],
  images: {
    unoptimized: false,
    // Hostnames do CDN configurados via env (ver `buildImageRemotePatterns`).
    // Em produção, defina `NEXT_PUBLIC_CDN_URL=https://cdn.seu-dominio.com`.
    // Em dev, fica vazio → imagens externas falham explicitamente em vez
    // de mostrarem placeholder silencioso.
    remotePatterns: buildImageRemotePatterns(),
  },
  // Proxy transparente de `/api/v1/*` para o NestJS API.
  // O BC `admin/feature-flags` expõe rotas versionadas em `/api/v1/admin/...`
  // e a SDK cliente (FeatureFlagClient) chama esses endpoints pelo mesmo
  // prefixo. Sem o rewrite, requisições do browser a `/api/v1/admin/...`
  // bateriam no próprio Next.js (404). Esta camada unifica a URL pública
  // para os clientes e mantém o API interno isolado em :3001.
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    // O nonce precisa ser estável POR REQUEST para que o mesmo valor
    // apareça na CSP e no atributo `nonce=` dos scripts gerados. Geramos
    // uma vez aqui e reusamos em todos os headers abaixo.
    const nonce = generateNonce();
    const isDev = process.env.NODE_ENV !== 'production';

    // Em dev, Next.js (Turbopack) injeta chunks sem nonce e HMR usa eval
    // inline + scripts dinâmicos. `'nonce-...'` ou `'strict-dynamic'`
    // quebram a hidratação em dev — qualquer um dos dois faz o browser
    // bloquear scripts inline (RSC boot) que não carregam o atributo
    // `nonce`. Em prod, mantemos nonce + strict-dynamic (H11). Em dev,
    // usamos `'unsafe-inline' + 'unsafe-eval'` sem nonce.
    const scriptSrc = isDev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
    const xNonce = isDev ? '' : nonce;

    return [
      {
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          ...(xNonce
            ? [
                {
                  key: 'x-nonce',
                  value: xNonce,
                },
              ]
            : []),
          {
            // CSP com nonce por request em produção. Em dev, sem nonce
            // (Turbopack injeta inline sem nonce). Ver comentário acima.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss: http: https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
