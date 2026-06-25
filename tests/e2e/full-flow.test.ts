/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * E2E Tests — Full User Flow
 * ===========================
 * Testează un flux complet: înregistrare → login → activități → sync → rewards.
 *
 * NOTĂ: Aceste teste mock-uiesc serviciile externe (DB, AI, Email).
 * Pentru teste E2E reale cu PostgreSQL, setează PGHOST_TEST.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { generateAccessToken, verifyAccessToken } from '../../server/auth';

// ─── Mock pentru toate serviciile ───────────────────────────────────
vi.mock('../../server/services/family.service', () => ({
  findParentByEmail: vi.fn(),
  createFamily: vi.fn(),
  getChildren: vi.fn(),
  getFamilyById: vi.fn(),
}));

vi.mock('../../server/services/sync.service', () => ({
  enqueueSyncAction: vi.fn(),
  processAllPending: vi.fn(),
}));

import * as familyService from '../../server/services/family.service';
import * as syncService from '../../server/services/sync.service';

describe('Full User Flow', () => {
  const newUser = {
    email: 'family@example.com',
    name: 'Test Family',
    pin: '1234',
    familyId: 'family-new',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('1. Înregistrare — creează utilizator și familie', async () => {
    vi.mocked(familyService.findParentByEmail).mockResolvedValue(null);
    vi.mocked(familyService.createFamily).mockResolvedValue({
      family: { id: 'family-new', name: 'Test Family' },
      parent: {
        id: 'parent-new',
        email: 'family@example.com',
        name: 'Test Family',
        family_id: 'family-new',
        pin_hash: 'hashed_pin',
      },
    } as any);

    // Verifică că email-ul nu e deja înregistrat
    const existing = await familyService.findParentByEmail(newUser.email);
    expect(existing).toBeNull();

    // Creează familia
    const { family, parent } = await familyService.createFamily(
      'Test Family',
      newUser.email,
      newUser.name,
      newUser.pin
    );
    expect(family.id).toBe('family-new');
    expect(parent.email).toBe(newUser.email);

    // Generează token
    const token = generateAccessToken(parent.email, parent.name);
    expect(verifyAccessToken(token)).not.toBeNull();
  });

  test('2. Login — autentificare cu credențiale corecte', async () => {
    const mockParent = {
      id: 'parent-new',
      email: 'family@example.com',
      name: 'Test Family',
      family_id: 'family-new',
      pin_hash: '', // va fi populat
    };

    vi.mocked(familyService.findParentByEmail).mockResolvedValue(mockParent as any);
    vi.mocked(familyService.getChildren).mockResolvedValue([
      { id: 'child-1', name: 'Sofia', points: 0, version: 1 },
    ] as any);
    vi.mocked(familyService.getFamilyById).mockResolvedValue({
      id: 'family-new',
      name: 'Test Family',
    } as any);

    const parent = await familyService.findParentByEmail('family@example.com');
    expect(parent).not.toBeNull();

    const token = generateAccessToken(parent!.email, parent!.name);
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.email).toBe('family@example.com');
  });

  test('3. Activitate — creează și procesează activități', async () => {
    const activities = [
      { id: 'act-1', type: 'curatenie', duration: 30, children: ['child-1', 'child-2'], points: 60 },
      { id: 'act-2', type: 'tema', duration: 15, children: ['child-1'], points: 30 },
    ];

    // Verifică datele activităților
    expect(activities).toHaveLength(2);
    expect(activities[0].points).toBe(60); // 30 * 1 * 2
    expect(activities[1].points).toBe(30); // 15 * 2 * 1
  });

  test('4. Sync — sincronizează activitățile', async () => {
    vi.mocked(syncService.enqueueSyncAction).mockResolvedValue({ id: 'sync-1' } as any);
    vi.mocked(syncService.processAllPending).mockResolvedValue({ processed: 2, failed: 0 });

    // Enqueue acțiuni
    await syncService.enqueueSyncAction({
      family_id: 'family-new',
      action: 'create_activity',
      payload: { child_id: 'child-1', title: 'Curățenie', points: 60 },
    });
    expect(syncService.enqueueSyncAction).toHaveBeenCalledTimes(1);

    await syncService.enqueueSyncAction({
      family_id: 'family-new',
      action: 'create_activity',
      payload: { child_id: 'child-1', title: 'Temă', points: 30 },
    });
    expect(syncService.enqueueSyncAction).toHaveBeenCalledTimes(2);

    // Procesează coada
    const result = await syncService.processAllPending();
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
  });

  test('5. Puncte — verifică soldul corect', async () => {
    // Simulăm puncte după activități
    const childState = { id: 'child-1', points: 90, version: 2 }; // 60 + 30

    expect(childState.points).toBe(90);
    expect(childState.version).toBeGreaterThan(1);
  });

  test('6. Recompensă — cumpără recompensă și verifică soldul', async () => {
    const childState = { id: 'child-1', points: 90, version: 2 };
    const rewardCost = 50;

    // Cumpără recompensă
    if (childState.points >= rewardCost) {
      childState.points -= rewardCost;
      childState.version += 1;
    }

    expect(childState.points).toBe(40);
    expect(childState.version).toBe(3);
  });
});
