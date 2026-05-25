import { NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function GET() {
  try {
    const user = await apiClient.getMe();

    if (!user) {
      return NextResponse.json(null);
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(null);
  }
}
