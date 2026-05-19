/**
 * PostgreSQL client using postgres.js
 * Provides a sql template tag for safe parameter interpolation
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres.js client with connection pooling
const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export { sql };
