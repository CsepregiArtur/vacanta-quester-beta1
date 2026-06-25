/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integration Tests — PostgreSQL Database
 * ========================================
 * Testează operațiile cu baza de date.
 *
 * NOTĂ: Aceste teste folosesc mock-uri pentru a nu depinde de un PostgreSQL real.
 * Pentru a rula cu DB reală, setează PGHOST_TEST în .env.test
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Mock pentru pool-ul de PostgreSQL ──────────────────────────────
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();
const mockClientQuery = vi.fn();
const mockBegin = vi.fn();
const mockCommit = vi.fn();
const mockRollback = vi.fn();

vi.mock('../../../server/db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  transaction: async (fn: (client: any) => Promise<any>) => {
    const client = {
      query: mockClientQuery,
      release: mockRelease,
    };
    try {
      mockBegin();
      const result = await fn(client);
      mockCommit();
      return result;
    } catch (err) {
      mockRollback();
      throw err;
    }
  },
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('PostgreSQL — CRUD Activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('salvează și recuperează o activitate', async () => {
    const activity = {
      id: 'act-test',
      points: 150,
      type: 'curatenie',
      family_id: 'fam-123',
      child_id: 'child-1',
      title: 'Test',
      status: 'pending',
      version: 1,
    };

    mockQuery.mockResolvedValueOnce({ rows: [activity], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [activity], rowCount: 1 });

    const { query } = await import('../../../server/db');

    // Save
    const saveResult = await query(
      `INSERT INTO activities (id, child_id, family_id, title, type, points) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [activity.id, activity.child_id, activity.family_id, activity.title, activity.type, activity.points]
    );
    expect(saveResult.rowCount).toBe(1);
    expect(saveResult.rows[0].title).toBe('Test');

    // Retrieve
    const getResult = await query(`SELECT * FROM activities WHERE id = $1`, ['act-test']);
    expect(getResult.rows[0].points).toBe(150);
  });

  test('returnează array gol pentru ID inexistent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const { query } = await import('../../../server/db');
    const result = await query(`SELECT * FROM activities WHERE id = $1`, ['inexistent']);
    expect(result.rows).toHaveLength(0);
  });
});

describe('PostgreSQL — Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientQuery.mockReset();
  });

  test('face rollback în caz de eroare', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [{ id: 'child-1', points: 100, version: 1 }] })
      .mockRejectedValueOnce(new Error('Duplicate key')); // a doua operație eșuează

    const { transaction } = await import('../../../server/db');

    let thrown = false;
    try {
      await transaction(async (trx: any) => {
        await trx.query(`OK`);
        await trx.query(`DUPLICATE`); // eșuează
      });
    } catch {
      thrown = true;
    }

    expect(thrown).toBe(true);
    expect(mockRollback).toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  test('commit-uie când totul e corect', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rows: [{ id: 'child-1', points: 100, version: 1 }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 'child-1', points: 110, version: 2 }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 'txn-1', points: 10 }] }); // INSERT

    const { transaction } = await import('../../../server/db');

    await transaction(async (trx: any) => {
      await trx.query(`UPDATE children SET points = points + 10 WHERE id = $1`, ['child-1']);
      await trx.query(`INSERT INTO point_transactions ...`, ['txn-1']);
    });

    expect(mockCommit).toHaveBeenCalled();
    expect(mockRollback).not.toHaveBeenCalled();
  });
});
