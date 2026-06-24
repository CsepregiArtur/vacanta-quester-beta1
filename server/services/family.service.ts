/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Family Service — gestionează familii, părinți, copii
 */

import { query, transaction } from "../db";
import bcrypt from "bcryptjs";

export interface FamilyRow {
  id: string;
  name: string;
  dog_walk_enabled: boolean;
  dog_walk_windows: any;
  home_assistant_config: any;
  smtp_config: any;
  subscription_type: string;
  created_at: string;
}

export interface ParentRow {
  id: string;
  family_id: string;
  email: string;
  name: string;
  pin_hash: string;
  created_at: string;
}

export interface ChildRow {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  birth_year: number;
  points: number;
  reading_streak: number;
  days_since_last_reading: number;
  created_at: string;
}

// ─── Creare familie nouă ───────────────────────────────────────────
export async function createFamily(
  name: string,
  parentEmail: string,
  parentName: string,
  pin: string
): Promise<{ family: FamilyRow; parent: ParentRow }> {
  return transaction(async (client) => {
    const { rows: [family] } = await client.query<FamilyRow>(
      `INSERT INTO families (name) VALUES ($1) RETURNING *`,
      [name]
    );

    const pinHash = await bcrypt.hash(pin, 10);
    const { rows: [parent] } = await client.query<ParentRow>(
      `INSERT INTO parents (family_id, email, name, pin_hash) VALUES ($1, $2, $3, $4) RETURNING *`,
      [family.id, parentEmail.toLowerCase(), parentName, pinHash]
    );

    return { family, parent };
  });
}

// ─── Căutare părinte după email ─────────────────────────────────────
export async function findParentByEmail(email: string): Promise<ParentRow | null> {
  const { rows } = await query<ParentRow>(
    `SELECT * FROM parents WHERE email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

// ─── Obține familia unui părinte ────────────────────────────────────
export async function getFamilyByParentId(parentId: string): Promise<FamilyRow | null> {
  const { rows: [parent] } = await query<ParentRow>(
    `SELECT * FROM parents WHERE id = $1`, [parentId]
  );
  if (!parent) return null;
  const { rows: [family] } = await query<FamilyRow>(
    `SELECT * FROM families WHERE id = $1`, [parent.family_id]
  );
  return family || null;
}

export async function getFamilyById(familyId: string): Promise<FamilyRow | null> {
  const { rows } = await query<FamilyRow>(
    `SELECT * FROM families WHERE id = $1`, [familyId]
  );
  return rows[0] || null;
}

// ─── Copii din familie ──────────────────────────────────────────────
export async function getChildren(familyId: string): Promise<ChildRow[]> {
  const { rows } = await query<ChildRow>(
    `SELECT * FROM children WHERE family_id = $1 ORDER BY created_at`,
    [familyId]
  );
  return rows;
}

// ─── Adăugare copil ─────────────────────────────────────────────────
export async function addChild(
  familyId: string,
  name: string,
  birthYear: number,
  avatar?: string
): Promise<ChildRow> {
  const age = new Date().getFullYear() - birthYear;
  const { rows: [child] } = await query<ChildRow>(
    `INSERT INTO children (family_id, name, avatar, birth_year, points) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [familyId, name, avatar || "🐶", birthYear, age >= 12 ? 0 : 0]
  );
  return child;
}

// ─── Actualizare copil ──────────────────────────────────────────────
export async function updateChild(
  childId: string,
  data: Partial<Pick<ChildRow, "points" | "reading_streak" | "days_since_last_reading">> & { expectedVersion?: number }
): Promise<ChildRow | { conflict: true; currentVersion?: number } | null> {
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && key !== "expectedVersion") {
      sets.push(`${key} = $${idx++}`);
      vals.push(val);
    }
  }
  if (sets.length === 0) return null;

  const expectedVersion = (data as any).expectedVersion;

  if (expectedVersion !== undefined) {
    sets.push(`updated_at = NOW(), version = version + 1`);
    vals.push(childId, expectedVersion);
    const result = await query<ChildRow>(
      `UPDATE children SET ${sets.join(", ")} WHERE id = $${idx} AND version = $${idx + 1} RETURNING *`,
      vals
    );
    if (result.rowCount === 0) {
      const { rows } = await query(`SELECT version FROM children WHERE id = $1`, [childId]);
      if (rows.length > 0) {
        return { conflict: true, currentVersion: rows[0].version };
      }
      return null;
    }
    return result.rows[0] || null;
  }

  // Fără version check
  sets.push(`updated_at = NOW()`);
  vals.push(childId);
  const { rows } = await query<ChildRow>(
    `UPDATE children SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    vals
  );
  return rows[0] || null;
}

// ─── Șterge copil ───────────────────────────────────────────────────
export async function deleteChild(childId: string): Promise<void> {
  await query(`DELETE FROM children WHERE id = $1`, [childId]);
}

// ─── Actualizare configurare familie ────────────────────────────────
export async function updateFamilyConfig(
  familyId: string,
  config: Partial<{
    dog_walk_enabled: boolean;
    dog_walk_windows: any;
    home_assistant_config: any;
    smtp_config: any;
  }>
): Promise<void> {
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;
  for (const [key, val] of Object.entries(config)) {
    if (val !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(typeof val === "object" ? JSON.stringify(val) : val);
    }
  }
  if (sets.length === 0) return;
  vals.push(familyId);
  await query(
    `UPDATE families SET ${sets.join(", ")} WHERE id = $${idx}`,
    vals
  );
}
