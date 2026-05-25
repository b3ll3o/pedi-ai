#!/usr/bin/env tsx
/**
 * Seed script para banco de desenvolvimento.
 *
 * ATENÇÃO: Este script está desatualizado e usa SQLite.
 * A migração para PostgreSQL/Prisma está em andamento.
 * Use o Prisma para operações de seed em produção:
 *
 *   cd apps/api && pnpm prisma db seed
 *
 * Este script será removido em breve.
 */

import { randomBytes, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

interface SeedData {
  customer: { email: string; password: string; id: string };
  admin: { email: string; password: string; id: string; resetToken: string };
  waiter: { email: string; password: string; id: string };
  table: { id: string; code: string };
  categories: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; price: number }>;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateEmail(): string {
  return `test-${generateId()}@pedi-ai.test`;
}

export async function createTestData(): Promise<SeedData> {
  const customer = {
    email: generateEmail(),
    password: 'TestPassword123!',
    id: generateId(),
  };

  const admin = {
    email: generateEmail(),
    password: 'AdminPassword123!',
    id: generateId(),
    resetToken: `reset-token-${generateId()}`,
  };

  const waiter = {
    email: generateEmail(),
    password: 'WaiterPassword123!',
    id: generateId(),
  };

  const table = {
    id: generateId(),
    code: `TABLE-${generateId().substring(0, 6).toUpperCase()}`,
  };

  const categories = [
    { id: generateId(), name: 'Bebidas' },
    { id: generateId(), name: 'Pratos Principais' },
    { id: generateId(), name: 'Sobremesas' },
  ];

  const products = [
    { id: generateId(), name: 'Coca-Cola', price: 5.99 },
    { id: generateId(), name: 'Picanha', price: 45.99 },
    { id: generateId(), name: 'Tiramisu', price: 15.99 },
  ];

  return { customer, admin, waiter, table, categories, products };
}

export async function cleanupTestData(_data: SeedData): Promise<void> {
  // Cleanup futuro será implementado via Prisma
}
