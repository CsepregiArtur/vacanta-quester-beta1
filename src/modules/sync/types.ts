/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync Queue — Offline-First Action Queue
 * =========================================
 * Every user action writes to local store FIRST, then enqueues a sync action.
 * The SyncEngine processes the queue when online.
 */

// ─── Supported sync action types ─────────────────────────────────────
export type SyncActionType =
  // Activities
  | "complete_activity"
  | "approve_activity"
  | "reject_activity"
  | "create_activity"
  | "delete_activity"
  // Rewards
  | "buy_reward"
  | "create_reward"
  | "delete_reward"
  // Points / Transactions
  | "award_points"
  | "cashout_points"
  // Children
  | "add_child"
  | "update_child"
  | "delete_child"
  // Photos
  | "upload_photo"
  // Suggestions
  | "submit_suggestion"
  | "approve_suggestion"
  | "reject_suggestion"
  // Walk
  | "claim_walk_slot"
  // Settings
  | "update_settings"
  | "update_pin";

// ─── A single sync queue item ────────────────────────────────────────
export interface SyncQueueItem {
  /** Unique client-generated ID for deduplication */
  id: string;
  /** The action to perform on the server */
  action: SyncActionType;
  /** ISO timestamp of when the action was created locally */
  timestamp: string;
  /** Number of times this item has been retried */
  retryCount: number;
  /** Current status */
  status: "pending" | "in_flight" | "completed" | "failed";
  /** Error message from last failed attempt */
  lastError?: string;
  /** Action-specific payload */
  payload: Record<string, unknown>;
}

// ─── Sync queue storage ──────────────────────────────────────────────
export interface SyncQueueStore {
  /** All pending/in_flight/failed items (not yet completed) */
  queue: SyncQueueItem[];
  /** Completed items (capped at 100 for audit trail) */
  history: SyncQueueItem[];
  /** Last successful sync timestamp */
  lastSyncAt: string | null;
  /** Current online status */
  isOnline: boolean;
}

// ─── Offline-first local database snapshot ───────────────────────────
export interface LocalDbSnapshot {
  /** The full AppState cached locally */
  state: Record<string, unknown>;
  /** Last time the local snapshot was written */
  lastUpdated: string;
  /** Client-side version counter for conflict resolution */
  version: number;
}

// ─── Sync engine events ──────────────────────────────────────────────
export type SyncEvent =
  | { type: "queue_changed"; queueLength: number }
  | { type: "sync_started" }
  | { type: "sync_completed"; itemsProcessed: number }
  | { type: "sync_failed"; itemId: string; error: string }
  | { type: "online_status_changed"; isOnline: boolean }
  | { type: "conflict_detected"; itemId: string; resolution: "server_wins" | "client_wins" | "manual" };

// ─── Sync engine listener ────────────────────────────────────────────
export type SyncEventListener = (event: SyncEvent) => void;
