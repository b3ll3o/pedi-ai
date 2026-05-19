import { NextResponse } from 'next/server';
import { destroySession, clearSessionCookie } from '@/lib/auth/session';

export async function POST() {
  try {
    // Destroy session in database
    await destroySession();

    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', clearSessionCookie);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Erro ao fazer logout' }, { status: 500 });
  }
}
