/**
 * Sessão autenticada — substitui Supabase SSR createServerClient
 *
 * Fluxo:
 * 1. Login: autenticar() → token gerado → gravado em cookie httpOnly
 * 2. Proteger rotas: getSession() → lê cookie → valida token no DB
 * 3. Logout: signOut() → deleta token do DB → limpa cookie
 */

import { cookies } from 'next/headers';
import { sql } from '@/infrastructure/database/pg-client';
import { randomBytes } from 'crypto';

// Tempo de expiração da sessão: 7 dias
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  restaurantId?: string;
}

export interface Session {
  user: SessionUser;
  expiresAt: Date;
}

// ─── Criar token de sessão (usado após login) ─────────────────────────────────

export async function createSession(userId: string, _email: string, _role: string, _restaurantId?: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await sql`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (${token}, ${userId}, ${expiresAt.toISOString()}, NOW())
    ON CONFLICT (token) DO UPDATE
      SET expires_at = EXCLUDED.expires_at
  `;

  return token;
}

// ─── Obter sessão atual (rota API / Server Component) ───────────────────────────

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) return null;

  const sessions = await sql<{ user_id: string; email: string; role: string; restaurant_id?: string; expires_at: string }>`
    SELECT u.id as user_id, up.email, up.role, up.restaurant_id, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN users_profiles up ON up."userId" = u.id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  if (sessions.length === 0) return null;

  const row = sessions[0];
  return {
    user: {
      id: row.user_id,
      email: row.email,
      role: row.role,
      restaurantId: row.restaurant_id,
    },
    expiresAt: new Date(row.expires_at),
  };
}

// ─── Destruir sessão (logout) ──────────────────────────────────────────────────

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (token) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
}

// ─── Criar cookie de resposta com token ─────────────────────────────────────────

export function createSessionCookie(token: string): string {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // httpOnly, sameSite strict, path=/, expires
  return `session_token=${token}; HttpOnly; SameSite=Strict; Path=/; Expires=${expiresAt.toUTCString()}`;
}

// ─── Header para limpar cookie ──────────────────────────────────────────────────

export const clearSessionCookie = 'session_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';
