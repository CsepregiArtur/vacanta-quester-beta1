/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — Conflict Resolution
 * =================================
 * Testează logica de rezolvare a conflictelor pentru sincronizare.
 *
 * Strategia: Last Write Wins cu version number.
 * Pentru array-uri → merge
 * Pentru obiecte → îmbinare (shallow merge)
 */

import { describe, test, expect } from 'vitest';

// ─── Helper: rezolvă conflict între două versiuni ───────────────────
function resolveConflict(local: any, server: any): any {
  if (!local || !server) return server || local;

  const resolved: any = {};

  // Colectăm toate cheile
  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

  for (const key of allKeys) {
    const localVal = local[key];
    const serverVal = server[key];

    if (localVal === undefined) {
      resolved[key] = serverVal;
    } else if (serverVal === undefined) {
      resolved[key] = localVal;
    } else if (key === 'updatedAt' || key === 'updated_at') {
      // Last Write Wins: păstrăm timestamp-ul mai recent
      resolved[key] = new Date(serverVal) > new Date(localVal) ? serverVal : localVal;
    } else if (key === 'version') {
      resolved[key] = Math.max(localVal, serverVal);
    } else if (Array.isArray(localVal) && Array.isArray(serverVal)) {
      // Merge array-uri (fără duplicate)
      resolved[key] = [...new Set([...localVal, ...serverVal])];
    } else if (typeof localVal === 'object' && typeof serverVal === 'object'
               && localVal !== null && serverVal !== null
               && !Array.isArray(localVal) && !Array.isArray(serverVal)) {
      // Merge obiecte (shallow)
      resolved[key] = { ...localVal, ...serverVal };
    } else {
      // Last Write Wins: server-ul e considerat mai nou
      resolved[key] = serverVal;
    }
  }

  return resolved;
}

describe('Conflict Resolution', () => {
  test('păstrează ultima modificare (Last Write Wins)', () => {
    const local = {
      id: 'act-1',
      points: 100,
      updatedAt: '2026-06-24T10:00:00Z',
    };
    const server = {
      id: 'act-1',
      points: 150,
      updatedAt: '2026-06-24T11:00:00Z',
    };

    const resolved = resolveConflict(local, server);
    expect(resolved.points).toBe(150); // server-ul e mai nou
    expect(resolved.updatedAt).toBe('2026-06-24T11:00:00Z');
  });

  test('păstrează versiunea mai mare', () => {
    const local = { id: 'act-1', version: 5 };
    const server = { id: 'act-1', version: 3 };
    const resolved = resolveConflict(local, server);
    expect(resolved.version).toBe(5);
  });

  test('face merge pentru array-uri', () => {
    const local = { tags: ['a', 'b'] };
    const server = { tags: ['c'] };
    const resolved = resolveConflict(local, server);
    expect(resolved.tags).toEqual(['a', 'b', 'c']);
  });

  test('nu duplică valori în array-uri', () => {
    const local = { tags: ['a', 'b'] };
    const server = { tags: ['b', 'c'] };
    const resolved = resolveConflict(local, server);
    expect(resolved.tags).toEqual(['a', 'b', 'c']);
  });

  test('păstrează ambele valori în obiecte (shallow merge)', () => {
    const local = { meta: { view: 10 } };
    const server = { meta: { likes: 5 } };
    const resolved = resolveConflict(local, server);
    expect(resolved.meta).toEqual({ view: 10, likes: 5 });
  });

  test('server-ul suprascrie câmpurile simple când local e mai vechi', () => {
    const local = { id: 'x', points: 50, updatedAt: '2026-06-24T10:00:00Z' };
    const server = { id: 'x', points: 99, updatedAt: '2026-06-25T10:00:00Z' };
    const resolved = resolveConflict(local, server);
    expect(resolved.points).toBe(99);
  });

  test('returnează server dacă local e null', () => {
    const resolved = resolveConflict(null, { id: 'act-1', points: 100 });
    expect(resolved).toEqual({ id: 'act-1', points: 100 });
  });

  test('returnează local dacă server e null', () => {
    const resolved = resolveConflict({ id: 'act-1', points: 100 }, null);
    expect(resolved).toEqual({ id: 'act-1', points: 100 });
  });
});
