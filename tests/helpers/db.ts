/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test Helpers — Setup/Cleanup pentru baza de date
 * =================================================
 * Folosește un Pool separat de cel din producție (PGHOST_TEST).
 * Dacă nu există DB de test, testele care necesită DB sar peste ele.
 */

import { vi } from 'vitest';
import { testUsers } from '../fixtures/users';
import { testActivities } from '../fixtures/activities';

// ─── Mock Pool ──────────────────────────────────────────────────────
// Toate testele care nu necesită DB real folosesc un mock
export function mockDbPool() {
  return {
    connect: vi.fn(),
    query: vi.fn(),
    release: vi.fn(),
  };
}

// ─── Helper: creează un mock de query care returnează date controlate ─
export function createMockQuery<T>(rows: T[], rowCount = rows.length) {
  return vi.fn().mockResolvedValue({ rows, rowCount });
}

// ─── Setup DB pentru teste de integrare ─────────────────────────────
export async function setupTestDb() {
  // Verifică dacă există variabila de mediu pentru test DB
  const testDbUrl = process.env.PGHOST_TEST;
  if (!testDbUrl) {
    console.warn('[TEST] No PGHOST_TEST set — tests using real DB will be skipped.');
    return {
      isAvailable: false,
      cleanup: async () => {},
    };
  }

  // Aici s-ar face conexiunea reală la baza de test
  // și s-ar rula migrațiile + seed

  return {
    isAvailable: true,
    cleanup: async () => {
      // Șterge datele de test
    },
  };
}

// ─── Mock pentru server/services ────────────────────────────────────
export function mockServiceReturn<T>(data: T) {
  return vi.fn().mockResolvedValue(data);
}

export function mockServiceError(message: string) {
  return vi.fn().mockRejectedValue(new Error(message));
}
