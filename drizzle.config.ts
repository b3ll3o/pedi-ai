import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/web/src/infrastructure/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/pedi-ai.db',
  },
});
