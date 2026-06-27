/**
 * Helper de despacho HTTP — usado por contexto.steps.ts e extras.steps.ts.
 *
 * Recebe uma rota textual ("GET /api/v1/..." ou "POST /api/v1/... com o corpo:")
 * e chama o controller POJO correspondente, aplicando o guard.
 */

import { FeatureFlagsWorld, ApiResponse } from '../support/world';

/**
 * Despacha uma requisição. `rotaBruta` é o texto do step. O segundo
 * `method` é o método HTTP já extraído.
 */
export async function dispatchRequest(
  w: FeatureFlagsWorld,
  rotaBruta: string,
  method: string,
  body?: unknown
): Promise<ApiResponse> {
  const m = rotaBruta.match(/^(GET|POST|PATCH|DELETE)\s+(.+)$/);
  if (!m) throw new Error(`rota inválida: ${rotaBruta}`);
  const [, , path] = m;
  const effectiveMethod = (method || m[1]).toUpperCase();
  return dispatchByPath(w, path, effectiveMethod, body);
}

export async function dispatchByPath(
  w: FeatureFlagsWorld,
  path: string,
  method: string,
  body?: unknown
): Promise<ApiResponse> {
  // /evaluate
  if (path.startsWith('/api/v1/admin/feature-flags/evaluate') || path.includes('/evaluate?')) {
    const query = extractQuery(path);
    return w.callAvaliar(query);
  }

  const auditDelete = path.match(/^\/api\/v1\/admin\/feature-flags\/([^/]+)\/audit\/(.+)$/);
  if (auditDelete && method === 'DELETE') {
    return { status: 405, body: { message: 'Method Not Allowed' } };
  }

  const auditMatch = path.match(/^\/api\/v1\/admin\/feature-flags\/([^/]+)\/audit\/?(\?.*)?$/);
  if (auditMatch) {
    const key = auditMatch[1];
    const query = extractQuery(path);
    return w.callController('listarAudit', [key, { limit: 50, offset: 0, ...query }], method);
  }

  const overrideDelete = path.match(
    /^\/api\/v1\/admin\/feature-flags\/([^/]+)\/overrides\/([^/?]+)/
  );
  if (overrideDelete && method === 'DELETE') {
    const key = overrideDelete[1];
    const id = overrideDelete[2];
    return w.callController('removerOverride', [key, id], method);
  }

  const overridePost = path.match(
    /^\/api\/v1\/admin\/feature-flags\/([^/]+)\/overrides\/?(\?.*)?$/
  );
  if (overridePost && method === 'POST') {
    const key = overridePost[1];
    return w.callController('adicionarOverride', [key, body ?? {}], method);
  }
  if (overridePost && method === 'GET') {
    const key = overridePost[1];
    const query = extractQuery(path);
    return w.callController('listarOverrides', [key, { limit: 50, offset: 0, ...query }], method);
  }

  if (path === '/api/v1/admin/feature-flags' || path === '/api/v1/admin/feature-flags/') {
    if (method === 'GET') {
      const query = extractQuery(path);
      return w.callController('listar', [{ limit: 50, offset: 0, ...query }], method);
    }
    if (method === 'POST') {
      return w.callController('criar', [body ?? {}], method);
    }
  }

  const flagMatch = path.match(/^\/api\/v1\/admin\/feature-flags\/([^/?]+)\/?(\?.*)?$/);
  if (flagMatch) {
    const key = flagMatch[1];
    if (method === 'GET') return w.callController('obter', [key], method);
    if (method === 'PATCH') return w.callController('atualizar', [key, body ?? {}], method);
  }

  return { status: 404, body: { message: `rota não mapeada: ${method} ${path}` } };
}

export function extractQuery(path: string): Record<string, string> {
  const idx = path.indexOf('?');
  if (idx < 0) return {};
  const qs = path.slice(idx + 1);
  const out: Record<string, string> = {};
  for (const part of qs.split('&')) {
    const [k, v] = part.split('=');
    if (k && v !== undefined) out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
}
