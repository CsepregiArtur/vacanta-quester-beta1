/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Audit Service — înregistrare acțiuni pentru trasabilitate
 *
 * "Cine a dat 100 puncte?" → audit_log
 */

import { query } from "../db";

export interface AuditLogEntry {
  id: string;
  family_id: string | null;
  parent_id: string | null;
  child_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditInput {
  familyId?: string | null;
  parentId?: string | null;
  childId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Înregistrează o acțiune în audit log.
 * Operația este asincronă și nu aruncă erori.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (family_id, parent_id, child_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.familyId || null,
        input.parentId || null,
        input.childId || null,
        input.action,
        input.entityType,
        input.entityId || null,
        input.oldValues ? JSON.stringify(input.oldValues) : null,
        input.newValues ? JSON.stringify(input.newValues) : null,
        input.ipAddress || null,
        input.userAgent || null,
      ]
    );
  } catch (err: any) {
    console.error(`[Audit] Failed to log ${input.action}:`, err.message);
  }
}

/**
 * Obține audit log pentru o familie
 */
export async function getFamilyAuditLog(
  familyId: string,
  limit = 100,
  offset = 0
): Promise<AuditLogEntry[]> {
  const { rows } = await query<AuditLogEntry>(
    `SELECT * FROM audit_log
     WHERE family_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [familyId, limit, offset]
  );
  return rows;
}
