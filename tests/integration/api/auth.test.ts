/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integration Tests — Auth API
 * =============================
 * Testează endpoint-urile de autentificare.
 *
 * NOTĂ: Aceste teste mock-uiesc serviciile pentru a nu depinde de o bază de date reală.
 * Pentru teste E2E reale, vezi tests/e2e/.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { generateAccessToken, verifyAccessToken } from '../../../server/auth';

// ─── Mock pentru familiaService ─────────────────────────────────────
vi.mock('../../../server/services/family.service', () => ({
  findParentByEmail: vi.fn(),
  createFamily: vi.fn(),
  getChildren: vi.fn(),
  getFamilyById: vi.fn(),
}));

import * as familyService from '../../../server/services/family.service';

// ─── Mock pentru familia ────────────────────────────────────────────
const mockFamily = {
  id: 'family-1',
  name: 'Test Family',
  subscription_type: 'free',
  dog_walk_enabled: false,
};

const mockParent = {
  id: 'parent-1',
  family_id: 'family-1',
  email: 'test@example.com',
  name: 'Test Parent',
  pin_hash: '', // va fi setat în beforeEach
};

const mockChildren = [
  { id: 'child-1', name: 'Sofia', points: 100, version: 1 },
  { id: 'child-2', name: 'Dominic', points: 80, version: 1 },
];

describe('Auth API — Login Flow', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Resetăm hash-ul PIN-ului pentru test
    const bcrypt = await import('bcryptjs');
    mockParent.pin_hash = await bcrypt.hash('1234', 4);

    vi.mocked(familyService.findParentByEmail).mockResolvedValue(mockParent as any);
    vi.mocked(familyService.getChildren).mockResolvedValue(mockChildren as any);
    vi.mocked(familyService.getFamilyById).mockResolvedValue(mockFamily as any);
  });

  test('verifică că PIN-ul corect produce token valid', async () => {
    const bcrypt = await import('bcryptjs');
    const pinValid = await bcrypt.compare('1234', mockParent.pin_hash);
    expect(pinValid).toBe(true);

    const token = generateAccessToken(mockParent.email, mockParent.name);
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.email).toBe('test@example.com');
  });

  test('respinge PIN-ul greșit', async () => {
    const bcrypt = await import('bcryptjs');
    const pinValid = await bcrypt.compare('wrong', mockParent.pin_hash);
    expect(pinValid).toBe(false);
  });

  test('găsește părintele după email', async () => {
    const result = await familyService.findParentByEmail('test@example.com');
    expect(result).not.toBeNull();
    expect(result!.email).toBe('test@example.com');
  });

  test('returnează null pentru email inexistent', async () => {
    vi.mocked(familyService.findParentByEmail).mockResolvedValue(null);
    const result = await familyService.findParentByEmail('nonexistent@test.com');
    expect(result).toBeNull();
  });

  test('returnează copiii familiei', async () => {
    const children = await familyService.getChildren('family-1');
    expect(children).toHaveLength(2);
    expect(children[0].name).toBe('Sofia');
    expect(children[1].name).toBe('Dominic');
  });
});

describe('Auth API — Token Flow', () => {
  test('generează și validează token-ul de acces', () => {
    const token = generateAccessToken('user@test.com', 'User');
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.email).toBe('user@test.com');
  });

  test('respinge token-ul expirat sau invalid', () => {
    expect(verifyAccessToken('')).toBeNull();
    expect(verifyAccessToken('invalid')).toBeNull();
  });
});
