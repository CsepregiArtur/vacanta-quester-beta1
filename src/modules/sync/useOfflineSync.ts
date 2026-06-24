/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useOfflineSync — React hook for offline-first operations
 * ==========================================================
 *
 * Usage:
 *   const { syncEngine, isOnline, enqueue, queueLength, syncStatus } = useOfflineSync();
 *
 *   // After updating local state optimistically:
 *   enqueue("complete_activity", { childId: "dominic", activityId: "123" });
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { getSyncEngine, SyncEngine } from "./SyncEngine";
import type { SyncActionType, SyncQueueItem } from "./types";

export interface SyncStatus {
  isOnline: boolean;
  queueLength: number;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: string | null;
  isProcessing: boolean;
}

export function useOfflineSync() {
  const syncEngineRef = useRef<SyncEngine>(getSyncEngine());
  const engine = syncEngineRef.current;

  const [status, setStatus] = useState<SyncStatus>({
    isOnline: engine.isOnline,
    queueLength: engine.getQueueLength(),
    pendingCount: engine.getPendingCount(),
    failedCount: engine.getFailedCount(),
    lastSyncAt: engine.getLastSyncAt(),
    isProcessing: false,
  });

  useEffect(() => {
    const unsub = engine.on((event) => {
      setStatus({
        isOnline: engine.isOnline,
        queueLength: engine.getQueueLength(),
        pendingCount: engine.getPendingCount(),
        failedCount: engine.getFailedCount(),
        lastSyncAt: engine.getLastSyncAt(),
        isProcessing: event.type === "sync_started",
      });
    });

    // Periodic status refresh
    const interval = setInterval(() => {
      setStatus((prev) => ({
        ...prev,
        isOnline: engine.isOnline,
        queueLength: engine.getQueueLength(),
        pendingCount: engine.getPendingCount(),
        failedCount: engine.getFailedCount(),
        lastSyncAt: engine.getLastSyncAt(),
      }));
    }, 2000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [engine]);

  const enqueue = useCallback(
    (action: SyncActionType, payload: Record<string, unknown>) => {
      return engine.enqueue(action, payload);
    },
    [engine]
  );

  const enqueueBatch = useCallback(
    (
      items: Array<{ action: SyncActionType; payload: Record<string, unknown> }>
    ) => {
      return engine.enqueueBatch(items);
    },
    [engine]
  );

  const saveSnapshot = useCallback(
    (state: Record<string, unknown>) => {
      engine.saveSnapshot(state);
    },
    [engine]
  );

  const retryFailed = useCallback(() => {
    engine.retryFailed();
  }, [engine]);

  const clearCompleted = useCallback(() => {
    engine.clearCompleted();
  }, [engine]);

  const getQueue = useCallback((): SyncQueueItem[] => {
    return engine.getQueue();
  }, [engine]);

  return {
    syncEngine: engine,
    isOnline: status.isOnline,
    enqueue,
    enqueueBatch,
    saveSnapshot,
    retryFailed,
    clearCompleted,
    getQueue,
    queueLength: status.queueLength,
    pendingCount: status.pendingCount,
    failedCount: status.failedCount,
    lastSyncAt: status.lastSyncAt,
    isProcessing: status.isProcessing,
    syncStatus: status,
  };
}
