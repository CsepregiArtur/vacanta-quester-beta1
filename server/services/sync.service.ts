/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync Service — procesare coadă de sincronizare, conflict resolution
 * 
 * Strategie: Last Write Wins cu version number pentru trackare
 */

import { query } from "../db";
import { trackEvent } from "./analytics.service";

export interface SyncQueueRow {
  id: string;
  family_id: string;
  action: string;
  payload: any;
  status: "pending" | "processing" | "completed" | "failed";
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

// ─── Procesează următoarea acțiune din coadă ────────────────────────
export async function processNextAction(): Promise<boolean> {
  const { rows: [item] } = await query<SyncQueueRow>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
  );
  if (!item) return false;

  try {
    await query(`UPDATE sync_queue SET status = 'processing' WHERE id = $1`, [item.id]);
    
    // Procesează în funcție de tipul acțiunii
    await processAction(item);
    
    await query(`UPDATE sync_queue SET status = 'completed' WHERE id = $1`, [item.id]);
    return true;
  } catch (err: any) {
    console.error(`[SYNC] Failed to process ${item.id}:`, err.message);
    await query(
      `UPDATE sync_queue SET status = 'failed' WHERE id = $1`,
      [item.id]
    );
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
      const { child_id, points, reason } = payload;
      await query(
        `UPDATE children SET points = GREATEST(0, points + $1) WHERE id = $2`,
        [points, child_id]
      );
      await query(
        `INSERT INTO point_transactions (child_id, points, reason, version) VALUES ($1, $2, $3, $4)`,
        [child_id, points, reason, item.version]
      );
      break;
    }
    case "complete_activity": {
      const { activity_id } = payload;
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
      const { child_id, reward_id, reward_name, cost_points } = payload;
      await query(
        `UPDATE children SET points = GREATEST(0, points - $1) WHERE id = $2`,
        [cost_points, child_id]
      );
      trackEvent({
        eventName: "reward_claimed",
        familyId: family_id,
        childId: child_id,
        properties: { rewardId: reward_id, rewardName: reward_name, costPoints: cost_points, source: "sync" },
      });
      break;
    }
    case "update_child": {
      const { child_id, ...updates } = payload;
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined && ALLOWED_CHILD_FIELDS.has(key)) {
          sets.push(`${key} = $${idx++}`);
          vals.push(val);
        }
      }
      if (sets.length > 0) {
        vals.push(child_id);
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
