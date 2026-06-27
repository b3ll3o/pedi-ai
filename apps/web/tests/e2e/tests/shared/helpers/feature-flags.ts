/**
 * Helpers E2E — Feature Flags
 * Funções utilitárias usadas pelos specs Playwright em `tests/admin/feature-flags.spec.ts`.
 *
 * Centraliza:
 *  - Chamada a GET /evaluate com/sem contexto.
 *  - Construção de headers e query string.
 *  - Tipagem compartilhada do snapshot.
 */
import { type APIRequestContext, type Page, expect } from '@playwright/test';

export interface FeatureFlagSnapshot {
  [key: string]: boolean | string | number | unknown;
}

export interface EvaluateOptions {
  restaurantId?: string;
  userId?: string;
}

/**
 * Chama GET /api/v1/admin/feature-flags/evaluate e retorna mapa key→valor.
 * Aceita `restaurantId` e `userId` no contexto, alinhado com design.md §6.1.
 */
export async function evaluateFeatureFlags(
  context: APIRequestContext | Page,
  keys: string[],
  opts: EvaluateOptions = {}
): Promise<FeatureFlagSnapshot> {
  const request = 'request' in context ? context.request : context;
  const params = new URLSearchParams({ keys: keys.join(',') });
  if (opts.restaurantId) params.set('restaurantId', opts.restaurantId);
  if (opts.userId) params.set('userId', opts.userId);

  const resp = await request.get(`/api/v1/admin/feature-flags/evaluate?${params.toString()}`);
  expect(resp, `evaluate HTTP status`).toBeTruthy();
  expect(resp.status(), `evaluate status`).toBeLessThan(400);
  return (await resp.json()) as FeatureFlagSnapshot;
}

/**
 * Cria uma flag via REST. Retorna o id da flag criada.
 * Helper usado em specs de setup/cleanup; em produção o painel cria via UI.
 */
export async function createFlag(
  context: APIRequestContext | Page,
  payload: {
    key: string;
    description?: string;
    valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
    defaultValue: unknown;
  }
): Promise<{ id: string; key: string }> {
  const request = 'request' in context ? context.request : context;
  const resp = await request.post('/api/v1/admin/feature-flags', { data: payload });
  expect(resp.status(), `create flag status`).toBe(201);
  return resp.json();
}

/**
 * Adiciona override via REST. Retorna id do override.
 */
export async function addOverride(
  context: APIRequestContext | Page,
  flagKey: string,
  payload: {
    scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
    scopeId?: string | null;
    value: unknown;
    rolloutPct?: number;
    expiresAt?: string;
  }
): Promise<{ id: string }> {
  const request = 'request' in context ? context.request : context;
  const resp = await request.post(`/api/v1/admin/feature-flags/${flagKey}/overrides`, {
    data: payload,
  });
  expect(resp.status(), `add override status`).toBe(201);
  return resp.json();
}

/**
 * Remove override por id. Idempotente — não falha se já removido.
 */
export async function removeOverride(
  context: APIRequestContext | Page,
  flagKey: string,
  overrideId: string
): Promise<void> {
  const request = 'request' in context ? context.request : context;
  const resp = await request.delete(
    `/api/v1/admin/feature-flags/${flagKey}/overrides/${overrideId}`
  );
  // 204 ou 404 (já removido) são aceitáveis
  expect([204, 404]).toContain(resp.status());
}

/**
 * Lista audit log de uma flag (limite pequeno para testes rápidos).
 */
export async function getAuditLog(
  context: APIRequestContext | Page,
  flagKey: string,
  limit = 10
): Promise<
  Array<{
    id: string;
    action: string;
    actorId: string;
    before: unknown;
    after: unknown;
    createdAt: string;
  }>
> {
  const request = 'request' in context ? context.request : context;
  const resp = await request.get(`/api/v1/admin/feature-flags/${flagKey}/audit?limit=${limit}`);
  expect(resp.status(), `audit log status`).toBe(200);
  const body = await resp.json();
  return body.data;
}
