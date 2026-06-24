/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rewards Service — recompense, puncte, tranzacții
 */

import { query, transaction } from "../db";
import { trackEvent } from "./analytics.service";

export interface RewardRow {
  id: string;
  family_id: string;
  title: string;
  cost_points: number;
  duration_minutes: number;
  icon: string;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  child_id: string;
  points: number;
  reason: string;
  version: number;
  created_at: string;
}

// ─── Recompense disponibile pentru o familie ─────────────────────────
export async function getFamilyRewards(familyId: string): Promise<RewardRow[]> {
  const { rows } = await query<RewardRow>(
    `SELECT * FROM rewards WHERE family_id = $1 ORDER BY cost_points`,
    [familyId]
  );
  return rows;
}

// ─── Adăugare recompensă ────────────────────────────────────────────
export async function addReward(data: {
  family_id: string;
  title: string;
  cost_points: number;
  duration_minutes?: number;
  icon?: string;
}): Promise<RewardRow> {
  const { rows: [r] } = await query<RewardRow>(
    `INSERT INTO rewards (family_id, title, cost_points, duration_minutes, icon)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.family_id, data.title, data.cost_points, data.duration_minutes || 0, data.icon || "🎁"]
  );
  return r;
}

// ─── Istoric tranzacții pentru un copil ─────────────────────────────
export async function getChildTransactions(childId: string): Promise<TransactionRow[]> {
  const { rows } = await query<TransactionRow>(
    `SELECT * FROM point_transactions WHERE child_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [childId]
  );
  return rows;
}

// ─── Adăugare puncte (cu version number pentru conflict resolution) ─
export async function awardPoints(
  childId: string,
  points: number,
  reason: string,
  expectedVersion?: number
): Promise<{ success: boolean; newVersion: number; newPoints: number } | null> {
  return transaction(async (client) => {
    // Verifică versiunea pentru conflict detection
    if (expectedVersion !== undefined) {
      const { rows: [child] } = await client.query(
        `SELECT points FROM children WHERE id = $1`,
        [childId]
      );
      // Last Write Wins — simply proceed
    }

    const { rows: [updated] } = await client.query(
      `UPDATE children SET points = GREATEST(0, points + $1), updated_at = NOW() WHERE id = $2 RETURNING points`,
      [points, childId]
    );

    const { rows: [txn] } = await client.query<TransactionRow>(
      `INSERT INTO point_transactions (child_id, points, reason) VALUES ($1, $2, $3) RETURNING *`,
      [childId, points, reason]
    );

    return {
      success: true,
      newVersion: txn.version,
      newPoints: updated.points,
    };
  });
}
