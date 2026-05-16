// ============================================================
// Dev Database Client — SQLite via Drizzle (dev local)
// ============================================================
// Em dev, exporta instância Drizzle + helpers de auth.
// API routes usam diretamente via api-client.ts.

// ── Setup ──────────────────────────────────────────────────

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createHash } from 'crypto';
import { mkdirSync } from 'fs';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_URL || './data/pedi-ai.db';

mkdirSync('./data', { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export { sqlite };
export const db = drizzle(sqlite, { schema });

// ── Auth helpers ───────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function hashPassword(password: string): string {
  return createHash('sha256')
    .update(password + JWT_SECRET)
    .digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ── Dev Auth Database (credenciais em memória + SQLite) ───

// Sessions em memória (reset a cada restart do dev server — aceitável)
const devSessions = new Map<string, { userId: string; email: string; role: string }>();

export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function storeSession(
  token: string,
  data: { userId: string; email: string; role: string }
): void {
  devSessions.set(token, data);
}

export function getSession(token: string) {
  return devSessions.get(token);
}

export function deleteSession(token: string): void {
  devSessions.delete(token);
}

export function setGlobalToken(token: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__devAuthToken = token;
}

export function getGlobalToken(): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).__devAuthToken;
}
