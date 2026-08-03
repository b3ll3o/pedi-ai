import { NextRequest, NextResponse } from 'next/server';

import { getApiClient } from '@/lib/api-client';
import { forwardSetCookies } from '@/lib/auth/forward-cookies';

export async function GET(request: NextRequest) {
  try {
    const client = getApiClient(request);
    const user = await client.getMe();

    if (!user) {
      const response = NextResponse.json(null);
      return forwardSetCookies(response, client.consumeSetCookies());
    }

    const response = NextResponse.json({ user });
    return forwardSetCookies(response, client.consumeSetCookies());
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(null);
  }
}
