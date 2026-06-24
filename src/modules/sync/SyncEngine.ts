/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SyncEngine — Offline-First Local-First Data Layer
 * ===================================================
 *
 * FLOW:
 *   User Action
 *       ↓
 *   1. Write to LocalStore (IndexedDB/localStorage) ← IMMEDIATE
 *       ↓
 *   2. Update React state / UI ← OPTIMISTIC
 *       ↓
 *   3. Enqueue SyncQueueItem ← DEFERRED
 *       ↓
 *   4. SyncEngine processes queue (when online) ← ASYNC
 *       ↓
 *   5. Server confirms → mark completed
 *
 * BENEFITS:
 *   - App works fully offline
 *   - UI updates instantly (optimistic)
 *   - Queue survives page reload (persisted)
 *   - Automatic retry with exponential backoff
 */

import {
  SyncQueueItem,
  SyncQueueStore,
  SyncActionType,
  SyncEvent,
  SyncEventListener,
  LocalDbSnapshot,
} from "./types";

// ─── Constants ───────────────────────────────────────────────────────
const STORAGE_KEY_QUEUE = "arcadia_sync_queue";
const STORAGE_KEY_SNAPSHOT = "arcadia_local_snapshot";
const MAX_RETRY_COUNT = 10;
const MAX_HISTORY_SIZE = 100;
const SYNC_INTERVAL_MS = 5000; // Check every 5 seconds when online

// ─── API endpoint mapping ────────────────────────────────────────────
function getEndpointForAction(action: SyncActionType): string {
  // All sync actions go through the single /api/sync/action endpoint
  return "/api/sync/action";
}

// ─── Retry delay: exponential backoff with jitter ────────────────────
function getRetryDelayMs(retryCount: number): number {
  const base = 1000; // 1 second
  const maxDelay = 30_000; // 30 seconds
  const exponential = Math.min(base * Math.pow(2, retryCount), maxDelay);
  const jitter = Math.random() * 1000;
  return Math.round(exponential + jitter);
}

// ─── SyncEngine Class ────────────────────────────────────────────────
export class SyncEngine {
  private store: SyncQueueStore;
  private snapshot: LocalDbSnapshot | null = null;
  private listeners: Set<SyncEventListener> = new Set();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private onlineStatus: boolean = navigator.onLine;

  constructor() {
    this.store = this.loadQueue();
    this.snapshot = this.loadSnapshot();
    this.setupOnlineListeners();
    this.startAutoSync();
  }

  // ── Events ───────────────────────────────────────────────────────

  on(event: SyncEventListener): () => void {
    this.listeners.add(event);
    return () => this.listeners.delete(event);
  }

  private emit(evt: SyncEvent): void {
    this.listeners.forEach((fn) => fn(evt));
  }

  // ── Queue Persistence ────────────────────────────────────────────

  private loadQueue(): SyncQueueStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (raw) {
        const parsed = JSON.parse(raw) as SyncQueueStore;
        return {
          queue: parsed.queue ?? [],
          history: parsed.history ?? [],
          lastSyncAt: parsed.lastSyncAt ?? null,
          isOnline: parsed.isOnline ?? navigator.onLine,
        };
      }
    } catch (e) {
      console.warn("[SyncEngine] Failed to load queue from localStorage:", e);
    }
    return {
      queue: [],
      history: [],
      lastSyncAt: null,
      isOnline: navigator.onLine,
    };
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(this.store));
    } catch (e) {
      console.error("[SyncEngine] Failed to save queue:", e);
    }
  }

  private loadSnapshot(): LocalDbSnapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOT);
      if (raw) return JSON.parse(raw) as LocalDbSnapshot;
    } catch {
      /* ignore */
    }
    return null;
  }

  /** Save the current AppState as the local snapshot */
  saveSnapshot(state: Record<string, unknown>): void {
    const current = this.loadSnapshot();
    this.snapshot = {
      state,
      lastUpdated: new Date().toISOString(),
      version: (current?.version ?? 0) + 1,
    };
    try {
      localStorage.setItem(
        STORAGE_KEY_SNAPSHOT,
        JSON.stringify(this.snapshot)
      );
    } catch (e) {
      console.error("[SyncEngine] Failed to save snapshot:", e);
    }
  }

  getSnapshot(): LocalDbSnapshot | null {
    return this.snapshot;
  }

  // ── Online / Offline Detection ───────────────────────────────────

  private setupOnlineListeners(): void {
    window.addEventListener("online", () => {
      this.onlineStatus = true;
      this.store.isOnline = true;
      this.saveQueue();
      this.emit({ type: "online_status_changed", isOnline: true });
      this.processQueue(); // Flush queue immediately when back online
    });

    window.addEventListener("offline", () => {
      this.onlineStatus = false;
      this.store.isOnline = false;
      this.saveQueue();
      this.emit({ type: "online_status_changed", isOnline: false });
    });
  }

  get isOnline(): boolean {
    return this.onlineStatus;
  }

  // ── Auto Sync Timer ──────────────────────────────────────────────

  private startAutoSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.onlineStatus && this.store.queue.length > 0) {
        this.processQueue();
      }
    }, SYNC_INTERVAL_MS);
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.listeners.clear();
  }

  // ── Enqueue Action ───────────────────────────────────────────────

  /**
   * Enqueue a sync action.
   * Call this AFTER writing to local store and updating UI.
   *
   * @returns The created SyncQueueItem
   */
  enqueue(
    action: SyncActionType,
    payload: Record<string, unknown>
  ): SyncQueueItem {
    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      action,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
      payload,
    };

    this.store.queue.push(item);
    this.saveQueue();
    this.emit({ type: "queue_changed", queueLength: this.store.queue.length });

    // Try to process immediately if online
    if (this.onlineStatus) {
      this.processQueue();
    }

    return item;
  }

  /** Enqueue multiple actions atomically */
  enqueueBatch(items: Array<{ action: SyncActionType; payload: Record<string, unknown> }>): SyncQueueItem[] {
    const created: SyncQueueItem[] = [];
    for (const item of items) {
      const syncItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        action: item.action,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending" as const,
        payload: item.payload,
      };
      this.store.queue.push(syncItem);
      created.push(syncItem);
    }
    this.saveQueue();
    this.emit({ type: "queue_changed", queueLength: this.store.queue.length });
    if (this.onlineStatus) this.processQueue();
    return created;
  }

  // ── Queue Processing ─────────────────────────────────────────────

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.onlineStatus) return;
    this.isProcessing = true;
    this.emit({ type: "sync_started" });

    let processed = 0;

    try {
      // Process items in FIFO order, skip completed
      const pendingItems = [...this.store.queue];
      
      for (const item of pendingItems) {
        if (item.status === "completed") continue;
        if (item.retryCount >= MAX_RETRY_COUNT) {
          item.status = "failed";
          item.lastError = "Max retries exceeded";
          this.emit({ type: "sync_failed", itemId: item.id, error: item.lastError });
          continue;
        }

        item.status = "in_flight";
        this.saveQueue();

        try {
          const success = await this.sendToServer(item);
          if (success) {
            item.status = "completed";
            processed++;
            // Move to history
            this.moveToHistory(item);
          } else {
            item.retryCount++;
            item.status = "pending";
            item.lastError = "Server returned error";
            this.emit({ type: "sync_failed", itemId: item.id, error: item.lastError });
          }
        } catch (err: any) {
          item.retryCount++;
          item.status = "pending";
          item.lastError = err.message || "Network error";

          if (this.isNetworkError(err)) {
            // Network error — stop processing and retry later
            this.isProcessing = false;
            this.saveQueue();
            this.emit({
              type: "sync_failed",
              itemId: item.id,
              error: "Network unavailable, will retry later",
            });
            return;
          }

          this.emit({ type: "sync_failed", itemId: item.id, error: item.lastError });

          // Exponential backoff for this item
          if (item.retryCount < MAX_RETRY_COUNT) {
            await this.delay(getRetryDelayMs(item.retryCount));
          }
        }

        this.saveQueue();
      }
    } finally {
      this.isProcessing = false;
      if (processed > 0) {
        this.store.lastSyncAt = new Date().toISOString();
        this.saveQueue();
        this.emit({ type: "sync_completed", itemsProcessed: processed });
      }
      this.emit({ type: "queue_changed", queueLength: this.store.queue.length });
    }
  }

  private isNetworkError(err: any): boolean {
    return (
      err instanceof TypeError && 
      (err.message === "Failed to fetch" || err.message === "NetworkError when attempting to fetch resource.")
    );
  }

  private async sendToServer(item: SyncQueueItem): Promise<boolean> {
    const endpoint = getEndpointForAction(item.action);
    if (!endpoint) {
      console.warn(`[SyncEngine] No endpoint mapped for action: ${item.action}`);
      return false;
    }

    // Build the request payload with action metadata
    const requestBody = {
      action: item.action,
      childId: item.payload.childId || null,
      activityId: item.payload.activityId || item.payload.taskId || null,
      taskId: item.payload.taskId || item.payload.activityId || null,
      payload: item.payload,
      syncId: item.id,
      clientTimestamp: item.timestamp,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s timeout

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const data = await res.json();
      return data.success === true;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private moveToHistory(item: SyncQueueItem): void {
    const idx = this.store.queue.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      this.store.queue.splice(idx, 1);
    }
    this.store.history.unshift(item);
    if (this.store.history.length > MAX_HISTORY_SIZE) {
      this.store.history = this.store.history.slice(0, MAX_HISTORY_SIZE);
    }
  }

  // ── Queue Inspection ─────────────────────────────────────────────

  getQueueLength(): number {
    return this.store.queue.length;
  }

  getPendingCount(): number {
    return this.store.queue.filter((i) => i.status === "pending").length;
  }

  getFailedCount(): number {
    return this.store.queue.filter((i) => i.status === "failed").length;
  }

  getQueue(): SyncQueueItem[] {
    return [...this.store.queue];
  }

  getHistory(): SyncQueueItem[] {
    return [...this.store.history];
  }

  getLastSyncAt(): string | null {
    return this.store.lastSyncAt;
  }

  /** Clear all completed/failed items */
  clearCompleted(): void {
    this.store.queue = this.store.queue.filter(
      (i) => i.status === "pending" || i.status === "in_flight"
    );
    this.saveQueue();
    this.emit({ type: "queue_changed", queueLength: this.store.queue.length });
  }

  /** Retry all failed items */
  retryFailed(): void {
    let changed = false;
    for (const item of this.store.queue) {
      if (item.status === "failed") {
        item.status = "pending";
        item.retryCount = 0;
        item.lastError = undefined;
        changed = true;
      }
    }
    if (changed) {
      this.saveQueue();
      this.emit({ type: "queue_changed", queueLength: this.store.queue.length });
      if (this.onlineStatus) this.processQueue();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Singleton instance ──────────────────────────────────────────────
let _instance: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine {
  if (!_instance) {
    _instance = new SyncEngine();
  }
  return _instance;
}
