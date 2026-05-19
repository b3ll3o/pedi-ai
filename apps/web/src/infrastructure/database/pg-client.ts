/**
 * PostgreSQL client using postgres.js
 * Provides a sql template tag for safe parameter interpolation
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

// During build (no DATABASE_URL), create a dummy sql that won't crash the build
// It will throw at runtime if actually called without a valid connection
let sql: ReturnType<typeof postgres>;

/* eslint-disable @typescript-eslint/no-explicit-any */
if (!connectionString) {
  // Dummy sql for build time - will throw if called without DATABASE_URL
  sql = (((..._args: unknown[]) => {
    throw new Error('DATABASE_URL environment variable is not set');
  }) as any) as typeof sql;
} else {
  // Create postgres.js client with connection pooling
  sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export { sql };
