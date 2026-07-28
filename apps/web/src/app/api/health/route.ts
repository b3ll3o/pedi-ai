import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const origin = request.headers.get('origin');

  // Permite qualquer origem para o endpoint /api/health (não expõe dados
  // sensíveis — apenas status). Em outros endpoints REST, CORS deve ser
  // restrito por configuração explícita. Padrão para `Same-Origin` (sem
  // header Origin) também é permitido.
  const headers = new Headers();
  if (origin) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
  }

  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { headers });
}
