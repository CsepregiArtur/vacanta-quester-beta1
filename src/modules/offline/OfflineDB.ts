/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VQ Offline DB — IndexedDB local cache pentru web
 * ==================================================
 * Stochează: children, activities, rewards, transactions
 * Permite aplicației să funcționeze complet offline.
 * Se sincronizează cu serverul la reconectare.
 */

// ═══ Types ══════════════════════════════════════════════════════════

export interface OfflineChild {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  points: number;
  reading_streak: number;
  version: number;
}

export interface OfflineActivity {
  id: string;
  child_id: string;
  family_id: string;
  title: string;
  status: string;
  points: number;
  version: number;
}

export interface OfflineReward {
  id: string;
  family_id: string;
  title: string;
  cost_points: number;
  icon: string;
}

export interface OfflineTransaction {
  id: string;
  child_id: string;
  points: number;
  reason: string;
  created_at: string;
}

// ═══ IndexedDB wrapper ══════════════════════════════════════════════

const DB_NAME = "vq_offline";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("children")) {
        db.createObjectStore("children", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("activities")) {
        db.createObjectStore("activities", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("rewards")) {
        db.createObjectStore("rewards", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("transactions")) {
        db.createObjectStore("transactions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══ Generic CRUD helpers ═══════════════════════════════════════════

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function del(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ═══ Public API ═════════════════════════════════════════════════════

export const offlineDB = {
  // ── Children ─────────────────────────────────────────────────────
  async getChildren(): Promise<OfflineChild[]> {
    return getAll<OfflineChild>("children");
  },

  async saveChildren(children: OfflineChild[]): Promise<void> {
    for (const child of children) {
      await put("children", child);
    }
  },

  async upsertChild(child: OfflineChild): Promise<void> {
    await put("children", child);
  },

  // ── Activities ───────────────────────────────────────────────────
  async getActivities(childId?: string): Promise<OfflineActivity[]> {
    const all = await getAll<OfflineActivity>("activities");
    return childId ? all.filter((a) => a.child_id === childId) : all;
  },

  async saveActivities(activities: OfflineActivity[]): Promise<void> {
    for (const a of activities) {
      await put("activities", a);
    }
  },

  async upsertActivity(activity: OfflineActivity): Promise<void> {
    await put("activities", activity);
  },

  // ── Rewards ──────────────────────────────────────────────────────
  async getRewards(): Promise<OfflineReward[]> {
    return getAll<OfflineReward>("rewards");
  },

  async saveRewards(rewards: OfflineReward[]): Promise<void> {
    for (const r of rewards) {
      await put("rewards", r);
    }
  },

  // ── Transactions ─────────────────────────────────────────────────
  async getTransactions(): Promise<OfflineTransaction[]> {
    return getAll<OfflineTransaction>("transactions");
  },

  async saveTransactions(txns: OfflineTransaction[]): Promise<void> {
    for (const t of txns) {
      await put("transactions", t);
    }
  },

  // ── Bulk refresh (from pull sync) ────────────────────────────────
  async refreshAll(data: {
    children?: OfflineChild[];
    activities?: OfflineActivity[];
    rewards?: OfflineReward[];
    transactions?: OfflineTransaction[];
  }): Promise<void> {
    if (data.children) {
      await clearStore("children");
      await this.saveChildren(data.children);
    }
    if (data.activities) {
      await clearStore("activities");
      await this.saveActivities(data.activities);
    }
    if (data.rewards) {
      await clearStore("rewards");
      await this.saveRewards(data.rewards);
    }
    if (data.transactions) {
      await clearStore("transactions");
      await this.saveTransactions(data.transactions);
    }
    await this.setMeta("last_sync", new Date().toISOString());
  },

  // ── Metadata ─────────────────────────────────────────────────────
  async getMeta(key: string): Promise<string | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("meta", "readonly");
      const store = tx.objectStore("meta");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  async setMeta(key: string, value: string): Promise<void> {
    await put("meta", { key, value });
  },

  async clearAll(): Promise<void> {
    await clearStore("children");
    await clearStore("activities");
    await clearStore("rewards");
    await clearStore("transactions");
  },
};
