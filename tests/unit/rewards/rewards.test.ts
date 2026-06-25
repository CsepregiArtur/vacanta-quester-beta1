/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — Rewards Service
 * =============================
 * Testează logica de recompense: adăugare puncte, cumpărare recompense,
 * version check pentru prevenirea race condition.
 */

import { describe, test, expect } from 'vitest';

// ─── Helper: simulare awardPoints cu version check ──────────────────
interface ChildState {
  id: string;
  points: number;
  version: number;
}

async function awardPoints(
  child: ChildState,
  points: number,
  expectedVersion?: number
): Promise<{ success: boolean; newVersion: number; newPoints: number } | { conflict: true; currentVersion: number } | null> {
  if (!child) return null;

  if (expectedVersion !== undefined && child.version !== expectedVersion) {
    return { conflict: true, currentVersion: child.version };
  }

  child.points = Math.max(0, child.points + points);
  child.version += 1;

  return {
    success: true,
    newVersion: child.version,
    newPoints: child.points,
  };
}

async function buyReward(
  child: ChildState,
  cost: number,
  expectedVersion?: number
): Promise<{ success: boolean; newVersion: number; newPoints: number } | { conflict: true; currentVersion: number } | { error: string }> {
  if (!child) return { error: 'Copil inexistent' };

  if (expectedVersion !== undefined && child.version !== expectedVersion) {
    return { conflict: true, currentVersion: child.version };
  }

  if (child.points < cost) {
    return { error: `Puncte insuficiente: ${child.points} < ${cost}` };
  }

  child.points -= cost;
  child.version += 1;

  return {
    success: true,
    newVersion: child.version,
    newPoints: child.points,
  };
}

describe('Rewards — awardPoints', () => {
  test('adaugă puncte corect', async () => {
    const child: ChildState = { id: 'child-1', points: 100, version: 1 };
    const result = await awardPoints(child, 10);
    expect(result).toEqual({ success: true, newVersion: 2, newPoints: 110 });
  });

  test('detectează conflict de versiune', async () => {
    const child: ChildState = { id: 'child-1', points: 100, version: 5 };
    const result = await awardPoints(child, 10, 3); // expected version 3, current 5
    expect(result).toEqual({ conflict: true, currentVersion: 5 });
  });

  test('permite award când versiunile coincid', async () => {
    const child: ChildState = { id: 'child-1', points: 50, version: 2 };
    const result = await awardPoints(child, 20, 2);
    expect(result).toEqual({ success: true, newVersion: 3, newPoints: 70 });
  });

  test('nu permite puncte negative', async () => {
    const child: ChildState = { id: 'child-1', points: 5, version: 1 };
    const result = await awardPoints(child, -20);
    expect(result).toEqual({ success: true, newVersion: 2, newPoints: 0 });
  });

  test('returnează null pentru copil inexistent', async () => {
    const result = await awardPoints(null as any, 10);
    expect(result).toBeNull();
  });
});

describe('Rewards — buyReward', () => {
  test('permite cumpărarea cu puncte suficiente', async () => {
    const child: ChildState = { id: 'child-1', points: 100, version: 1 };
    const result = await buyReward(child, 50);
    expect(result).toEqual({ success: true, newVersion: 2, newPoints: 50 });
  });

  test('respinge cumpărarea cu puncte insuficiente', async () => {
    const child: ChildState = { id: 'child-1', points: 30, version: 1 };
    const result = await buyReward(child, 50);
    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('Puncte insuficiente');
  });

  test('detectează conflict de versiune la cumpărare', async () => {
    const child: ChildState = { id: 'child-1', points: 100, version: 3 };
    const result = await buyReward(child, 50, 1);
    expect(result).toEqual({ conflict: true, currentVersion: 3 });
  });

  test('permite cumpărare cu puncte exacte', async () => {
    const child: ChildState = { id: 'child-1', points: 50, version: 1 };
    const result = await buyReward(child, 50, 1);
    expect(result).toEqual({ success: true, newVersion: 2, newPoints: 0 });
  });

  test('incrementează versiunea după cumpărare', async () => {
    const child: ChildState = { id: 'child-1', points: 200, version: 5 };
    await buyReward(child, 30, 5);
    expect(child.version).toBe(6);
  });
});

describe('Rewards — calcul și validare', () => {
  test('punctele nu devin negative niciodată', () => {
    const child: ChildState = { id: 'child-1', points: 10, version: 1 };
    // Chiar și cu puncte mai multe decât are
    expect(Math.max(0, child.points - 100)).toBe(0);
  });

  test('awardPoints + buyReward păstrează soldul corect', async () => {
    const child: ChildState = { id: 'child-1', points: 50, version: 1 };

    await awardPoints(child, 30); // 50 + 30 = 80, v2
    expect(child.points).toBe(80);
    expect(child.version).toBe(2);

    await buyReward(child, 20, 2); // 80 - 20 = 60, v3
    expect(child.points).toBe(60);
    expect(child.version).toBe(3);
  });
});
