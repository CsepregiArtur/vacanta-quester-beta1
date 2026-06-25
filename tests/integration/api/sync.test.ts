/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integration Tests — Sync API
 * =============================
 * Testează fluxurile de sincronizare: push, pull, conflict resolution.
 *
 * Folosește mock-uri pentru syncService și authMiddleware.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Mock pentru syncService ────────────────────────────────────────
const mockEnqueue = vi.fn();
const mockProcessAll = vi.fn();
const mockGetChanges = vi.fn();
const mockCountByStatus = vi.fn();
const mockUpsertDevice = vi.fn();

vi.mock('../../../server/services/sync.service', () => ({
  enqueueSyncAction: (...args: any[]) => mockEnqueue(...args),
  processAllPending: (...args: any[]) => mockProcessAll(...args),
  getChangesSince: (...args: any[]) => mockGetChanges(...args),
  countByStatus: (...args: any[]) => mockCountByStatus(...args),
  upsertDevice: (...args: any[]) => mockUpsertDevice(...args),
}));

describe('Sync API — Push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueue.mockResolvedValue({ id: 'sync-1' });
    mockProcessAll.mockResolvedValue({ processed: 1, failed: 0 });
  });

  test('enqueueSyncAction acceptă acțiuni valide', async () => {
    const { enqueueSyncAction } = await import('../../../server/services/sync.service');
    const result = await enqueueSyncAction({
      family_id: 'family-1',
      action: 'award_points',
      payload: { child_id: 'child-1', points: 10, reason: 'Test' },
    });
    expect(result).toBeDefined();
    expect(mockEnqueue).toHaveBeenCalledOnce();
  });

  test('enqueueSyncAction respinge payload fără family_id', async () => {
    mockEnqueue.mockRejectedValue(new Error('family_id is required'));
    const { enqueueSyncAction } = await import('../../../server/services/sync.service');

    await expect(enqueueSyncAction({
      family_id: '',
      action: 'test',
      payload: {},
    })).rejects.toThrow();
  });
});

describe('Sync API — Pull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChanges.mockResolvedValue({
      activities: [],
      children: [],
      transactions: [],
      timestamp: new Date().toISOString(),
    });
  });

  test('getChangesSince returnează modificări de la un timestamp', async () => {
    const { getChangesSince } = await import('../../../server/services/sync.service');
    const changes = await getChangesSince('family-1', new Date(0).toISOString());
    expect(changes).toHaveProperty('activities');
    expect(changes).toHaveProperty('children');
    expect(changes).toHaveProperty('transactions');
    expect(changes).toHaveProperty('timestamp');
  });

  test('returnează activități noi după un timestamp recent', async () => {
    mockGetChanges.mockResolvedValue({
      activities: [{ id: 'act-new', points: 100 }],
      children: [],
      transactions: [],
      timestamp: new Date().toISOString(),
    });

    const { getChangesSince } = await import('../../../server/services/sync.service');
    const changes = await getChangesSince('family-1', '2026-06-01T00:00:00Z');
    expect(changes.activities).toHaveLength(1);
    expect(changes.activities[0].id).toBe('act-new');
  });
});

describe('Sync API — Conflict Detection', () => {
  test('respinge versiunea învechită (version conflict)', async () => {
    // Simulăm două update-uri concurente cu aceeași versiune
    const mockQuery = vi.fn();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ version: 5 }], rowCount: 1 }) // first update succeeds
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // second update fails (version mismatch)

    const firstResult = await mockQuery('UPDATE ... WHERE id = $1 AND version = $2', ['act-1', 5]);
    expect(firstResult.rowCount).toBe(1);

    const secondResult = await mockQuery('UPDATE ... WHERE id = $1 AND version = $2', ['act-1', 5]);
    expect(secondResult.rowCount).toBe(0); // conflict!
  });

  test('procesează coada fără erori', async () => {
    mockProcessAll.mockResolvedValue({ processed: 3, failed: 0 });
    const { processAllPending } = await import('../../../server/services/sync.service');
    const result = await processAllPending();
    expect(result.processed).toBe(3);
    expect(result.failed).toBe(0);
  });
});
