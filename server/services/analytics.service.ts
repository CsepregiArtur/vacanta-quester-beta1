/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics Service — track & query business events
 *
 * Evenimente suportate:
 *   activity_created       – o sarcină nouă a fost adăugată
 *   activity_completed     – o sarcină a fost marcată completată
 *   reward_claimed         – o recompensă a fost deblocată de un copil
 *   streak_lost            – un copil a pierdut streak-ul de citire
 *   subscription_started   – o familie a activat un abonament
 *   subscription_cancelled – o familie a anulat abonamentul
 *
 * Monitorizare:
 *   - Prometheus: contor vacanta_analytics_events_total{event_name="..."}
 *   - Loki:      JSON structurat în /var/log/vacanta/analytics.log
 */

import { query } from "../db";
import fs from "fs";
import path from "path";
import promClient from "prom-client";

// ─── Prometheus counter for analytics events ───────────────────────
const analyticsCounter: ReturnType<typeof createAnalyticsCounter> = createAnalyticsCounter();

function createAnalyticsCounter() {
  try {
    const existing = promClient.register.getSingleMetric("vacanta_analytics_events_total");
    if (existing) return existing as any;
  } catch { /* first time */ }
  return new promClient.Counter({
    name: "vacanta_analytics_events_total",
    help: "Total number of analytics business events",
    labelNames: ["event_name"],
  });
}

// ─── JSON log writer for Loki ──────────────────────────────────────
const ANALYTICS_LOG = process.env.ANALYTICS_LOG || "/var/log/vacanta/analytics.log";
let logStream: fs.WriteStream | null = null;

function getLogStream(): fs.WriteStream {
  if (logStream) return logStream;
  try {
    const dir = path.dirname(ANALYTICS_LOG);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    logStream = fs.createWriteStream(ANALYTICS_LOG, { flags: "a" });
    logStream.on("error", () => { /* ignore write errors */ });
  } catch {
    // Fallback: noop stream
    logStream = null as any;
  }
  return logStream!;
}

function writeJsonLog(event: {
  event_name: string;
  family_id: string | null;
  child_id: string | null;
  properties: Record<string, any>;
  source: string;
  timestamp: string;
}) {
  try {
    const stream = getLogStream();
    if (stream) {
      stream.write(JSON.stringify(event) + "\n");
    }
  } catch {
    // analytics logging must never crash the app
  }
}

export interface AnalyticsEvent {
  id: string;
  family_id: string | null;
  child_id: string | null;
  event_name: string;
  properties: Record<string, any>;
  source: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type EventName =
  | "activity_created"
  | "activity_completed"
  | "reward_claimed"
  | "streak_lost"
  | "subscription_started"
  | "subscription_cancelled";

export interface TrackEventInput {
  eventName: EventName;
  familyId?: string | null;
  childId?: string | null;
  properties?: Record<string, any>;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Înregistrează un eveniment de analytics în baza de date,
 * incrementează contorul Prometheus și scrie log JSON pentru Loki.
 * Operația este asincronă și nu aruncă erori — greșelile sunt doar logate.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    // 1. PostgreSQL
    await query(
      `INSERT INTO analytics_events (family_id, child_id, event_name, properties, source, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.familyId || null,
        input.childId || null,
        input.eventName,
        JSON.stringify(input.properties || {}),
        input.source || "web",
        input.ipAddress || null,
        input.userAgent || null,
      ]
    );

    // 2. Prometheus counter
    analyticsCounter.inc({ event_name: input.eventName });

    // 3. JSON log → Loki (promtail citește /var/log/vacanta/analytics.log)
    writeJsonLog({
      event_name: input.eventName,
      family_id: input.familyId || null,
      child_id: input.childId || null,
      properties: input.properties || {},
      source: input.source || "web",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // Nu blocăm fluxul principal din cauza analytics-ului
    console.error(`[Analytics] Failed to track ${input.eventName}:`, err.message);
  }
}

// ─── Interogări rapide ──────────────────────────────────────────────

/** Numărul total de evenimente dintr-un interval */
export async function countEvents(
  eventName?: EventName,
  since?: Date
): Promise<number> {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (eventName) {
    conditions.push(`event_name = $${idx++}`);
    params.push(eventName);
  }
  if (since) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(since.toISOString());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows: [row] } = await query(
    `SELECT COUNT(*)::int AS count FROM analytics_events ${where}`,
    params
  );
  return row?.count ?? 0;
}

/** Ultimele N evenimente pentru o familie */
export async function getRecentEvents(
  familyId: string,
  limit = 50
): Promise<AnalyticsEvent[]> {
  const { rows } = await query<AnalyticsEvent>(
    `SELECT * FROM analytics_events
     WHERE family_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [familyId, limit]
  );
  return rows;
}

/** Top evenimente per nume */
export async function getEventBreakdown(
  familyId?: string,
  since?: Date
): Promise<{ event_name: string; count: number }[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (familyId) {
    conditions.push(`family_id = $${idx++}`);
    params.push(familyId);
  }
  if (since) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(since.toISOString());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT event_name, COUNT(*)::int AS count
     FROM analytics_events ${where}
     GROUP BY event_name
     ORDER BY count DESC`,
    params
  );
  return rows;
}
