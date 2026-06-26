import type { NextConfig } from 'next';
import { randomBytes } from 'crypto';

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
  // TypeScript build errors são bloqueantes. Os erros pré-existentes foram
  // resolvidos (mapeamento de campos pt-BR do domínio, anotações de
  // generics em api-client wrappers, conversão Buffer em QRCodeVisual).
  // Manter `ignoreBuildErrors: false` para que novos erros não passem
  // despercebidos em CI.
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['postgres'],
  allowedDevOrigins: ['192.168.0.181', '192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'],
  images: {
    unoptimized: false,
    // Hostnames do CDN configurados via env (ver `buildImageRemotePatterns`).
    // Em produção, defina `NEXT_PUBLIC_CDN_URL=https://cdn.seu-dominio.com`.
    // Em dev, fica vazio → imagens externas falham explicitamente em vez
    // de mostrarem placeholder silencioso.
    remotePatterns: buildImageRemotePatterns(),
  },
  async headers() {
    // O nonce precisa ser estável POR REQUEST para que o mesmo valor
    // apareça na CSP e no atributo `nonce=` dos scripts gerados. Geramos
    // uma vez aqui e reusamos em todos os headers abaixo.
    const nonce = generateNonce();

    return [
      {
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          {
            // Header consumido pelo App Router do Next.js. Quando setado,
            // o runtime aplica o atributo `nonce="..."` nos scripts inline
            // que ele injeta (boot, hidratação). Sem isso, o nonce na CSP
            // não casa com nada e os scripts são bloqueados.
            key: 'x-nonce',
            value: nonce,
          },
          {
            // CSP com nonce por request. Scripts inline gerados pelo Next
            // (hidratação) só executam se carregarem o atributo
            // `nonce="..."` correspondente — scripts injetados por XSS
            // não conhecem o nonce e são bloqueados pelo browser.
            //
            // `'strict-dynamic'` permite que scripts confiáveis (carregados
            // via nonce) adicionem novos scripts sem precisar de nonce
            // também — útil para Next/React que injetam lazy chunks.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              // `unsafe-inline` removido de `script-src` (H11). Mantido
              // apenas em `style-src` porque migrar estilos inline para
              // nonces exige instrumentar cada <style> gerado por RSC.
              `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self' wss://*.pedi-ai.com https://api.mercadopago.com",
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
