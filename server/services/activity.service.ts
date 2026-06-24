/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity Service — task-uri, activități, reading history
 */

import { query } from "../db";
import { trackEvent } from "./analytics.service";

export interface ActivityRow {
  id: string;
  child_id: string;
  family_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  points: number;
  photo_url: string | null;
  ai_feedback: string | null;
  version: number;
  created_at: string;
  completed_at: string | null;
}

// ─── Activitate nouă ────────────────────────────────────────────────
export async function createActivity(data: {
  child_id: string;
  family_id: string;
  title: string;
  description?: string;
  type?: string;
  points?: number;
}): Promise<ActivityRow> {
  const { rows: [act] } = await query<ActivityRow>(
    `INSERT INTO activities (child_id, family_id, title, description, type, points)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.child_id, data.family_id, data.title, data.description || "", data.type || "chore", data.points || 0]
  );

  // Analytics
  trackEvent({
    eventName: "activity_created",
    familyId: data.family_id,
    childId: data.child_id,
    properties: { activityId: act.id, title: act.title, type: act.type, points: act.points },
  });

  return act;
}

// ─── Activități pendinte pentru un copil ────────────────────────────
export async function getPendingActivities(childId: string): Promise<ActivityRow[]> {
  const { rows } = await query<ActivityRow>(
    `SELECT * FROM activities WHERE child_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
    [childId]
  );
  return rows;
}

// ─── Toate activitățile unui copil ──────────────────────────────────
export async function getChildActivities(childId: string): Promise<ActivityRow[]> {
  const { rows } = await query<ActivityRow>(
    `SELECT * FROM activities WHERE child_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [childId]
  );
  return rows;
}

// ─── Finalizează activitate ─────────────────────────────────────────
export async function completeActivity(
  activityId: string,
  photoUrl?: string,
  expectedVersion?: number
): Promise<ActivityRow | { conflict: true; currentVersion?: number } | null> {
  if (expectedVersion !== undefined) {
    // Version check: actualizează DOAR dacă versiunea corespunde
    const result = await query<ActivityRow>(
      `UPDATE activities SET status = 'completed', completed_at = NOW(), updated_at = NOW(), photo_url = COALESCE($2, photo_url), version = version + 1
       WHERE id = $1 AND version = $3 RETURNING *`,
      [activityId, photoUrl, expectedVersion]
    );

    if (result.rowCount === 0) {
      // Verifică dacă activitatea există (conflict real vs. inexistentă)
      const { rows } = await query(`SELECT version FROM activities WHERE id = $1`, [activityId]);
      if (rows.length > 0) {
        return { conflict: true, currentVersion: rows[0].version };
      }
      return null; // nu există
    }

    const completed = result.rows[0];
    trackEvent({
      eventName: "activity_completed",
      familyId: completed.family_id,
      childId: completed.child_id,
      properties: { activityId: completed.id, title: completed.title, points: completed.points },
    });
    return completed;
  }

  // Fără version check (fallback)
  const { rows } = await query<ActivityRow>(
    `UPDATE activities SET status = 'completed', completed_at = NOW(), updated_at = NOW(), photo_url = COALESCE($2, photo_url), version = version + 1
     WHERE id = $1 RETURNING *`,
    [activityId, photoUrl]
  );

  const completed = rows[0] || null;
  if (completed) {
    trackEvent({
      eventName: "activity_completed",
      familyId: completed.family_id,
      childId: completed.child_id,
      properties: { activityId: completed.id, title: completed.title, points: completed.points },
    });
  }

  return completed;
}

// ─── Salvează reading history ───────────────────────────────────────
export async function saveReadingHistory(data: {
  child_id: string;
  topic: string;
  word_count: number;
  score: number;
}): Promise<void> {
  await query(
    `INSERT INTO reading_history (child_id, topic, word_count, score) VALUES ($1, $2, $3, $4)`,
    [data.child_id, data.topic, data.word_count, data.score]
  );
}
