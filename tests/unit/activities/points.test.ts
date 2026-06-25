/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — Points Calculator
 * ===============================
 * Testează logica de calcul și distribuire a punctelor.
 *
 * Concepte testate:
 *   - calcul puncte pe baza tipului și duratei
 *   - distribuire puncte între mai mulți copii
 *   - validare date activitate
 */

import { describe, test, expect } from 'vitest';

// ─── Helpere ────────────────────────────────────────────────────────

/**
 * Calculează punctele pentru o activitate.
 * Regula: tipurile diferite au multiplicatori diferiți.
 */
function calculatePoints(activity: {
  type: string;
  duration: number;
  children?: string[];
}): number {
  const multipliers: Record<string, number> = {
    curatenie: 1,
    tema: 2,
    reading: 3,
    dog_walk: 1.5,
    default: 1,
  };

  const multiplier = multipliers[activity.type] || multipliers.default;
  const basePoints = activity.duration * multiplier;

  // Bonus pentru activități cu mai mulți copii
  const childCount = activity.children?.length || 1;
  return Math.round(basePoints * childCount);
}

/**
 * Distribuie punctele între copii.
 */
function awardPoints(data: {
  children: string[];
  points: number;
}): Record<string, number> {
  if (data.children.length === 0) return {};
  const perChild = Math.round(data.points / data.children.length);
  return Object.fromEntries(data.children.map((c) => [c, perChild]));
}

/**
 * Validează datele unei activități.
 */
function validateActivity(activity: {
  type: string;
  duration: number;
}): void {
  const validTypes = ['curatenie', 'tema', 'reading', 'dog_walk', 'chore'];
  if (!activity.type || !validTypes.includes(activity.type)) {
    throw new Error(`Tipul activității trebuie să fie unul din: ${validTypes.join(', ')}`);
  }
  if (typeof activity.duration !== 'number' || Number.isNaN(activity.duration) || activity.duration <= 0) {
    throw new Error('Durata trebuie să fie un număr pozitiv');
  }
}

describe('Points Calculator — calculatePoints', () => {
  test('calculează corect punctele pentru curățenie', () => {
    const points = calculatePoints({
      type: 'curatenie',
      duration: 30,
      children: ['child-1', 'child-2'],
    });
    expect(points).toBe(60); // 30 * 1 * 2
  });

  test('calculează corect punctele pentru temă (multiplicator 2)', () => {
    const points = calculatePoints({
      type: 'tema',
      duration: 15,
      children: ['child-1'],
    });
    expect(points).toBe(30); // 15 * 2 * 1
  });

  test('calculează corect punctele pentru reading (multiplicator 3)', () => {
    const points = calculatePoints({
      type: 'reading',
      duration: 20,
      children: ['child-1'],
    });
    expect(points).toBe(60); // 20 * 3 * 1
  });

  test('returnează 0 pentru durată 0', () => {
    const points = calculatePoints({
      type: 'curatenie',
      duration: 0,
    });
    expect(points).toBe(0);
  });

  test('folosește multiplicator default pentru tipuri necunoscute', () => {
    const points = calculatePoints({
      type: 'altceva',
      duration: 10,
    });
    expect(points).toBe(10); // 10 * 1 * 1
  });
});

describe('Points Calculator — awardPoints', () => {
  test('distribuie punctele egal între copii', () => {
    const result = awardPoints({
      children: ['child-1', 'child-2'],
      points: 20,
    });
    expect(result['child-1']).toBe(10);
    expect(result['child-2']).toBe(10);
  });

  test('funcționează pentru un singur copil', () => {
    const result = awardPoints({
      children: ['child-1'],
      points: 50,
    });
    expect(result['child-1']).toBe(50);
  });

  test('returnează obiect gol pentru listă goală', () => {
    const result = awardPoints({
      children: [],
      points: 100,
    });
    expect(result).toEqual({});
  });

  test('punctele rămân întregi (rotunjire)', () => {
    const result = awardPoints({
      children: ['child-1', 'child-2', 'child-3'],
      points: 10,
    });
    // 10 / 3 = 3.33 → Math.round = 3 per copil (total 9, se pierde 1)
    expect(result['child-1']).toBe(3);
    expect(result['child-2']).toBe(3);
    expect(result['child-3']).toBe(3);
  });
});

describe('Points Calculator — validateActivity', () => {
  test('validează o activitate corectă', () => {
    expect(() => validateActivity({ type: 'curatenie', duration: 10 })).not.toThrow();
    expect(() => validateActivity({ type: 'tema', duration: 30 })).not.toThrow();
    expect(() => validateActivity({ type: 'reading', duration: 15 })).not.toThrow();
  });

  test('respinge tip invalid', () => {
    expect(() => validateActivity({ type: '', duration: 10 })).toThrow();
    expect(() => validateActivity({ type: 'invalid', duration: 10 })).toThrow();
  });

  test('respinge durată negativă', () => {
    expect(() => validateActivity({ type: 'curatenie', duration: -5 })).toThrow();
  });

  test('respinge durată 0', () => {
    expect(() => validateActivity({ type: 'curatenie', duration: 0 })).toThrow();
  });

  test('respinge durată non-numerică', () => {
    expect(() => validateActivity({ type: 'curatenie', duration: NaN })).toThrow();
  });
});
