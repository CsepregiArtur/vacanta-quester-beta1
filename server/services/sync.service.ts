/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync Service — procesare coadă de sincronizare, conflict resolution
 * 
 * Strategie: Last Write Wins cu version number pentru trackare
 */

import { query, transaction } from "../db";
import { trackEvent } from "./analytics.service";

export interface SyncQueueRow {
  id: string;
  family_id: string;
  action: string;
  payload: any;
  status: "pending" | "processing" | "completed" | "failed";
  retry_count: number;
  next_retry_at: string | null;
  last_error: string | null;
  version: number;
  device_id: string | null;
  created_at: string;
}

// ─── Adaugă acțiune în coada de sincronizare ────────────────────────
export async function enqueueSyncAction(data: {
  family_id: string;
  action: string;
  payload: any;
  device_id?: string;
}): Promise<SyncQueueRow> {
  const { rows: [item] } = await query<SyncQueueRow>(
    `INSERT INTO sync_queue (family_id, action, payload, device_id) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.family_id, data.action, JSON.stringify(data.payload), data.device_id || null]
  );
  return item;
}

const MAX_RETRIES = 5;

// Calculează următorul moment de retry cu exponential backoff
function getNextRetry(retryCount: number): string {
  const delays = [60_000, 300_000, 900_000, 3600_000]; // 1min, 5min, 15min, 1h
  const delayMs = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delayMs).toISOString();
}

// ─── Procesează următoarea acțiune din coadă ────────────────────────
export async function processNextAction(): Promise<boolean> {
  const { rows: [item] } = await query<SyncQueueRow>(
    `SELECT * FROM sync_queue 
     WHERE status = 'pending' 
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
     ORDER BY created_at ASC 
     LIMIT 1 
     FOR UPDATE SKIP LOCKED`
  );
  if (!item) return false;

  try {
    await query(`UPDATE sync_queue SET status = 'processing' WHERE id = $1`, [item.id]);
    
    await processAction(item);
    
    await query(`UPDATE sync_queue SET status = 'completed', last_error = NULL WHERE id = $1`, [item.id]);
    return true;
  } catch (err: any) {
    const newRetryCount = (item.retry_count || 0) + 1;
    console.error(`[SYNC] Failed to process ${item.id} (attempt ${newRetryCount}/${MAX_RETRIES}):`, err.message);

    if (newRetryCount >= MAX_RETRIES) {
      // Exhausted retries — mark as permanently failed
      await query(
        `UPDATE sync_queue SET status = 'failed', retry_count = $2, last_error = $3 WHERE id = $1`,
        [item.id, newRetryCount, err.message]
      );
    } else {
      // Schedule retry with exponential backoff (1min → 5min → 15min → 1h)
      const nextRetry = getNextRetry(newRetryCount);
      await query(
        `UPDATE sync_queue SET status = 'pending', retry_count = $2, next_retry_at = $3, last_error = $4 WHERE id = $1`,
        [item.id, newRetryCount, nextRetry, err.message]
      );
      console.log(`[SYNC] ${item.id} retry #${newRetryCount} scheduled at ${nextRetry}`);
    }
    return false;
  }
}

// ─── Obține modificări de la un timestamp (pull sync) ─────────────
export async function getChangesSince(
  familyId: string,
  since: string
): Promise<{
  activities: any[];
  children: any[];
  transactions: any[];
  timestamp: string;
}> {
  const [activities, children, transactions] = await Promise.all([
    query(
      `SELECT * FROM activities WHERE family_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [familyId, since]
    ),
    query(
      `SELECT * FROM children WHERE family_id = $1 AND updated_at > $2 ORDER BY updated_at ASC`,
      [familyId, since]
    ),
    query(
      `SELECT * FROM point_transactions WHERE child_id IN (SELECT id FROM children WHERE family_id = $1) AND created_at > $2 ORDER BY created_at ASC`,
      [familyId, since]
    ),
  ]);

  return {
    activities: activities.rows,
    children: children.rows,
    transactions: transactions.rows,
    timestamp: new Date().toISOString(),
  };
}

// Coloane permise pentru update_child (SQL injection protection)
const ALLOWED_CHILD_FIELDS = new Set([
  "name", "avatar", "birth_year", "points",
  "reading_streak", "days_since_last_reading",
]);

// ─── Procesează o acțiune individuală ───────────────────────────────
async function processAction(item: SyncQueueRow): Promise<void> {
  const { action, payload, family_id } = item;

  switch (action) {
    case "award_points": {
      const { child_id, points, reason, expected_version } = payload;
      await transaction(async (client) => {
        // Blochează rândul — atomic
        const { rows: [child] } = await client.query(
          `SELECT version FROM children WHERE id = $1 FOR UPDATE`,
          [child_id]
        );
        if (!child) throw new Error(`Child ${child_id} not found`);

        // Version check
        if (expected_version !== undefined && child.version !== expected_version) {
          throw new Error(`Version conflict: expected ${expected_version}, got ${child.version}`);
        }

        await client.query(
          `UPDATE children SET points = GREATEST(0, points + $1), updated_at = NOW(), version = version + 1 WHERE id = $2`,
          [points, child_id]
        );
        await client.query(
          `INSERT INTO point_transactions (child_id, points, reason, version) VALUES ($1, $2, $3, $4)`,
          [child_id, points, reason, item.version]
        );
      });
      break;
    }
    case "complete_activity": {
      const { activity_id, expected_version } = payload;
      if (expected_version !== undefined) {
        const result = await query(
          `UPDATE activities SET status = 'completed', completed_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1 AND version = $2 RETURNING *`,
          [activity_id, expected_version]
        );
        if (result.rowCount === 0) {
          const { rows } = await query(`SELECT version FROM activities WHERE id = $1`, [activity_id]);
          if (rows.length > 0) {
            throw new Error(`Version conflict: expected ${expected_version}, got ${rows[0].version}`);
          }
          throw new Error(`Activity ${activity_id} not found`);
        }
        const completedAct = result.rows[0];
        trackEvent({
          eventName: "activity_completed",
          familyId: family_id,
          childId: completedAct.child_id,
          properties: { activityId: completedAct.id, title: completedAct.title, points: completedAct.points, source: "sync" },
        });
      } else {
        // Fără version check
        const { rows: [completedAct] } = await query(
          `UPDATE activities SET status = 'completed', completed_at = NOW(), updated_at = NOW(), version = version + 1 WHERE id = $1 RETURNING *`,
          [activity_id]
        );
        if (completedAct) {
          trackEvent({
            eventName: "activity_completed",
            familyId: family_id,
            childId: completedAct.child_id,
            properties: { activityId: completedAct.id, title: completedAct.title, points: completedAct.points, source: "sync" },
          });
        }
      }
      break;
    }
    case "create_activity": {
      const { child_id, title, description, type, points } = payload;
      const { rows: [newAct] } = await query(
        `INSERT INTO activities (child_id, family_id, title, description, type, points) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [child_id, family_id, title, description || "", type || "chore", points || 0]
      );
      if (newAct) {
        trackEvent({
          eventName: "activity_created",
          familyId: family_id,
          childId: child_id,
          properties: { activityId: newAct.id, title: newAct.title, type: newAct.type, points: newAct.points, source: "sync" },
        });
      }
      break;
    }
    case "buy_reward": {
      const { child_id, reward_id, reward_name, cost_points, expected_version } = payload;
      await transaction(async (client) => {
        const { rows: [child] } = await client.query(
          `SELECT version, points FROM children WHERE id = $1 FOR UPDATE`,
          [child_id]
        );
        if (!child) throw new Error(`Child ${child_id} not found`);
        if (child.points < cost_points) throw new Error(`Insufficient points: ${child.points} < ${cost_points}`);

        if (expected_version !== undefined && child.version !== expected_version) {
          throw new Error(`Version conflict: expected ${expected_version}, got ${child.version}`);
        }

        await client.query(
          `UPDATE children SET points = GREATEST(0, points - $1), updated_at = NOW(), version = version + 1 WHERE id = $2`,
          [cost_points, child_id]
        );
      });
      trackEvent({
        eventName: "reward_claimed",
        familyId: family_id,
        childId: child_id,
        properties: { rewardId: reward_id, rewardName: reward_name, costPoints: cost_points, source: "sync" },
      });
      break;
    }
    case "update_child": {
      const { child_id, expected_version, ...updates } = payload;
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined && ALLOWED_CHILD_FIELDS.has(key)) {
          sets.push(`${key} = $${idx++}`);
          vals.push(val);
        }
      }
      if (sets.length === 0) break;

      sets.push(`updated_at = NOW(), version = version + 1`);
      vals.push(child_id);

      if (expected_version !== undefined) {
        vals.push(expected_version);
        const result = await query(
          `UPDATE children SET ${sets.join(", ")} WHERE id = $${idx} AND version = $${idx + 1}`,
          vals
        );
        if (result.rowCount === 0) {
          const { rows } = await query(`SELECT version FROM children WHERE id = $1`, [child_id]);
          if (rows.length > 0) {
            throw new Error(`Version conflict: expected ${expected_version}, got ${rows[0].version}`);
          }
          throw new Error(`Child ${child_id} not found`);
        }
      } else {
        await query(
          `UPDATE children SET ${sets.join(", ")} WHERE id = $${idx}`,
          vals
        );
      }
      break;
    }
    default:
      console.warn(`[SYNC] Unknown action: ${action}`);
  }
}

// ─── Procesează toate acțiunile pendinte ────────────────────────────
export async function processAllPending(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  while (await processNextAction()) {
    processed++;
  }
  return { processed, failed };
}

// ─── Numără acțiunile după status ──────────────────────────────────
export async function countByStatus(
  familyId: string,
  status: string
): Promise<number> {
  const { rows: [row] } = await query(
    `SELECT COUNT(*)::int AS count FROM sync_queue WHERE family_id = $1 AND status = $2`,
    [familyId, status]
  );
  return row?.count ?? 0;
}

// ══════════════════════════════════════════════════════════════════════
// DEVICE REGISTRY
// ══════════════════════════════════════════════════════════════════════

export interface DeviceRow {
  id: string;
  family_id: string;
  device_id: string;
  device_name: string | null;
  platform: string;
  last_seen: string;
  created_at: string;
}

/** Înregistrează sau actualizează un dispozitiv */
export async function upsertDevice(data: {
  family_id: string;
  device_id: string;
  device_name?: string;
  platform?: string;
}): Promise<void> {
  await query(
    `INSERT INTO devices (family_id, device_id, device_name, platform, last_seen)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (family_id, device_id)
     DO UPDATE SET device_name = COALESCE($3, devices.device_name),
                   platform = COALESCE($4, devices.platform),
                   last_seen = NOW()`,
    [data.family_id, data.device_id, data.device_name || null, data.platform || "web"]
  );
}

/** Listă dispozitive pentru o familie */
export async function getFamilyDevices(familyId: string): Promise<DeviceRow[]> {
  const { rows } = await query<DeviceRow>(
    `SELECT * FROM devices WHERE family_id = $1 ORDER BY last_seen DESC`,
    [familyId]
  );
  return rows;
}

/** Șterge un dispozitiv (logout remote) */
export async function removeDevice(familyId: string, deviceId: string): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM devices WHERE family_id = $1 AND device_id = $2`,
    [familyId, deviceId]
  );
  return (rowCount ?? 0) > 0;
}
