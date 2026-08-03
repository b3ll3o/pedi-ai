import { NextRequest, NextResponse } from 'next/server';

import { getApiClient } from '@/lib/api-client';
import { forwardSetCookies } from '@/lib/auth/forward-cookies';

export async function POST(request: NextRequest) {
  try {
    const client = getApiClient(request);
    await client.logout();

    const response = NextResponse.json({ success: true });
    return forwardSetCookies(response, client.consumeSetCookies());
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Erro ao fazer logout' }, { status: 500 });
  }
}
