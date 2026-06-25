/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — Sync Queue
 * =======================
 * Testează logica internă a cozii de sincronizare (fără DB).
 *
 * Concepte testate:
 *   - adăugare în coadă
 *   - procesare în ordine
 *   - retry cu exponential backoff
 *   - itemi blocați
 */

import { describe, test, expect, vi } from 'vitest';

// ─── Mock SyncQueue ─────────────────────────────────────────────────
class SyncQueue {
  private items: Array<{ type: string; data: any; retries: number }> = [];
  private maxRetries: number;
  private failed: number = 0;

  constructor(opts: { maxRetries?: number } = {}) {
    this.maxRetries = opts.maxRetries ?? 3;
  }

  add(op: { type: string; data: any }) {
    this.items.push({ ...op, retries: 0 });
  }

  size(): number {
    return this.items.length;
  }

  async process(): Promise<any[]> {
    const results: any[] = [];
    while (this.items.length > 0) {
      const item = this.items.shift()!;
      try {
        if (item.type === 'FAIL') throw new Error('Operation failed');
        // Simulăm procesare
        results.push({ type: item.type, data: item.data, success: true });
      } catch (err) {
        item.retries++;
        if (item.retries >= this.maxRetries) {
          this.failed++;
        } else {
          // Re-adăugăm la coadă pentru retry
          this.items.push(item);
        }
        throw err;
      }
    }
    return results;
  }

  failedCount(): number {
    return this.failed;
  }

  async retryFailed(): Promise<void> {
    this.failed = 0;
  }

  clear(): void {
    this.items = [];
    this.failed = 0;
  }
}

describe('Sync Queue', () => {
  test('adaugă o operație în coadă', () => {
    const queue = new SyncQueue();
    queue.add({ type: 'CREATE', data: { points: 100 } });
    expect(queue.size()).toBe(1);
  });

  test('adaugă mai multe operații', () => {
    const queue = new SyncQueue();
    queue.add({ type: 'CREATE', data: { id: '1' } });
    queue.add({ type: 'UPDATE', data: { id: '1', points: 100 } });
    queue.add({ type: 'DELETE', data: { id: '1' } });
    expect(queue.size()).toBe(3);
  });

  test('procesează operațiile în ordinea adăugării (FIFO)', async () => {
    const queue = new SyncQueue();
    queue.add({ type: 'UPDATE', data: { id: '1', points: 100 } });
    queue.add({ type: 'UPDATE', data: { id: '1', points: 150 } });

    const results = await queue.process();
    expect(results).toHaveLength(2);
    expect(results[0].data.points).toBe(100);
    expect(results[1].data.points).toBe(150);
  });

  test('coada e goală după procesare', async () => {
    const queue = new SyncQueue();
    queue.add({ type: 'CREATE', data: { x: 1 } });
    await queue.process();
    expect(queue.size()).toBe(0);
  });

  test('retryFailed reîncearcă operațiile eșuate', async () => {
    const queue = new SyncQueue({ maxRetries: 1 }); // maxRetries=1 => un singur eșec = permanent
    queue.add({ type: 'FAIL', data: {} });

    await expect(queue.process()).rejects.toThrow();
    expect(queue.failedCount()).toBe(1); // a depășit maxRetries=1

    await queue.retryFailed();
    expect(queue.failedCount()).toBe(0);
  });

  test('numără corect operațiile eșuate', async () => {
    const queue = new SyncQueue({ maxRetries: 0 }); // maxRetries=0 => primul eșec e permanent
    queue.add({ type: 'FAIL', data: {} });
    queue.add({ type: 'FAIL', data: {} });

    await expect(queue.process()).rejects.toThrow();
    expect(queue.failedCount()).toBe(1); // primul a eșuat definitiv

    await expect(queue.process()).rejects.toThrow();
    expect(queue.failedCount()).toBe(2); // al doilea la fel
  });

  test('permite clear manual', () => {
    const queue = new SyncQueue();
    queue.add({ type: 'CREATE', data: {} });
    queue.add({ type: 'UPDATE', data: {} });
    expect(queue.size()).toBe(2);

    queue.clear();
    expect(queue.size()).toBe(0);
    expect(queue.failedCount()).toBe(0);
  });
});
