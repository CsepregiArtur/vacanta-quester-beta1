/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test Setup — rulează înainte de fiecare fișier de test
 * =======================================================
 * Configurare globală: variabile de mediu, mock-uri, hook-uri.
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// 🔐 JWT_SECRET pentru teste
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';

// ─── Mock pentru fs (refresh_tokens.json în memorie) ────────────────
const mockTokenStore: { tokens: any[] } = { tokens: [] };

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs') as any;
  return {
    ...actual,
    existsSync: (path: string) => {
      if (path.includes('refresh_tokens.json')) return true;
      return actual.existsSync(path);
    },
    readFileSync: (path: string, encoding?: string) => {
      if (path.includes('refresh_tokens.json')) {
        return JSON.stringify(mockTokenStore);
      }
      return actual.readFileSync(path, encoding);
    },
    writeFileSync: (path: string, data: string) => {
      if (path.includes('refresh_tokens.json')) {
        Object.assign(mockTokenStore, JSON.parse(data));
        return;
      }
      return actual.writeFileSync(path, data);
    },
  };
});

// ─── Hook-uri globale ───────────────────────────────────────────────
beforeAll(() => {
  // Resetăm store-ul de token-uri
  mockTokenStore.tokens = [];
});

afterEach(() => {
  // Resetăm variabile de mediu dacă au fost suprascrise
  vi.restoreAllMocks();
});

afterAll(() => {
  // Curățare finală
});
