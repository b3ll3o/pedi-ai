import type { NextResponse } from 'next/server';

/**
 * Repassa ao browser os `Set-Cookie` emitidos pelo NestJS API.
 *
 * **Por que é necessário:** os Route Handlers `/api/auth/*` rodam em Node.
 * Quando eles chamam o NestJS (`POST /auth/login`), os `Set-Cookie` da
 * resposta ficam presos no `fetch` do servidor — o navegador nunca os
 * recebe. Resultado: `POST /api/auth/login` devolvia 200, mas
 * `GET /api/auth/session` seguinte não tinha cookie algum e devolvia
 * `null`, jogando o usuário de volta para `/admin/login`.
 *
 * Usa `headers.append` (não `set`) porque são dois cookies distintos
 * (`pedi_ai_access` e `pedi_ai_refresh`).
 */
export function forwardSetCookies(response: NextResponse, setCookies: string[]): NextResponse {
  for (const cookie of setCookies) {
    response.headers.append('set-cookie', cookie);
  }
  return response;
}
