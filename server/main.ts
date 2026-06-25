/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VQ Server — Punct de intrare (PostgreSQL + servicii noi)
 * ==========================================================
 * Rulează: npm run dev:new | npm run start:new
 *
 * Inițializează PostgreSQL și serviciile noi, apoi pornește serverul legacy.
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { initDatabase } from "./db";
import analyticsRoutes from "./routes/analytics.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import { syncService } from "./services";
import { errorHandler } from "./middleware/error-handler.middleware";

async function bootstrap() {
  try {
    await initDatabase();
    console.log(`[BOOT] PostgreSQL conectat`);
  } catch (err: any) {
    console.log(`[BOOT] PostgreSQL: ${err.message}. Se folosește JSON fallback.`);
  }
  
  // Montează rutele ÎNAINTE de serverul legacy
  const { app } = await import("./legacy/server");
  
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  console.log("[BOOT] Rute analytics + subscription montate");

  // Pornește queue processor (procesează sync_queue la fiecare 5 secunde)
  setInterval(async () => {
    try {
      const result = await syncService.processAllPending();
      if (result.processed > 0 || result.failed > 0) {
        console.log(`[SYNC] Queue processor: ${result.processed} processed, ${result.failed} failed`);
      }
    } catch (err: any) {
      console.error(`[SYNC] Queue processor error:`, err.message);
    }
  }, 5000);

  // Resetează itemele blocate (processing → pending la startup)
  try {
    const { query } = await import("./db");
    await query(`UPDATE sync_queue SET status = 'pending' WHERE status = 'processing'`);
    console.log("[SYNC] Reset stuck processing items → pending");

    // Migrare coloane noi (retry_count, next_retry_at, devices)
    await query(`ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ`);
    await query(`ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS last_error TEXT`);
    console.log("[DB] Schema migration: sync_queue columns OK");
  } catch (err: any) {
    console.error("[SYNC] Reset error:", err.message);
  }
}

bootstrap();

