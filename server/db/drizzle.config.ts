/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drizzle ORM — Configurare și migrări
 * ======================================
 * 
 * Inițializare:
 *   npx drizzle-kit generate  →  generează SQL în server/db/migrations/
 *   npx drizzle-kit migrate   →  aplică migrările în PostgreSQL
 * 
 * Pentru prima configurare:
 *   npm install drizzle-orm drizzle-kit pg
 *   npx drizzle-kit generate --config server/db/drizzle.config.ts
 *   npx drizzle-kit migrate --config server/db/drizzle.config.ts
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.PGHOST || "127.0.0.1",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "app_user_vq",
    password: process.env.PGPASSWORD || "vq_secret_2026",
    database: process.env.PGDATABASE || "vq_proiect",
    ssl: false,
  },
  verbose: true,
  strict: true,
});
