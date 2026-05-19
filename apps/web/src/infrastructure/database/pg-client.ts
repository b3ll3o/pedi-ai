/**
 * PostgreSQL client using postgres.js
 * Provides a sql template tag for safe parameter interpolation
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

// Type for postgres.js sql template tag - returns array of result rows
type SqlTemplate = ReturnType<typeof postgres>;

interface DummySql {
  <T>(template: TemplateStringsArray, ...params: unknown[]): Promise<T[]>;
  __brand: 'dummy';
}

// During build (no DATABASE_URL), create a dummy sql that won't crash the build
// It will throw at runtime if actually called without a valid connection
let sql: SqlTemplate | DummySql;

if (!connectionString) {
  // Dummy sql for build time - will throw if called without DATABASE_URL
  const dummyFn = (..._args: unknown[]) => {
    throw new Error('DATABASE_URL environment variable is not set');
  };
  sql = dummyFn as DummySql;
  sql.__brand = 'dummy';
} else {
  // Create postgres.js client with connection pooling
  sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export { sql };
export type { SqlTemplate };
