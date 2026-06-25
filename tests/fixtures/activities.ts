/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test Fixtures — Activități
 */

export const testActivities = [
  {
    id: 'act-1',
    child_id: 'child-1',
    family_id: 'family-1',
    title: 'Aspirat în Cameră',
    type: 'curatenie',
    points: 100,
    status: 'pending',
    version: 1,
    createdAt: new Date('2026-06-24').toISOString(),
  },
  {
    id: 'act-2',
    child_id: 'child-2',
    family_id: 'family-1',
    title: 'Temă Matematică',
    type: 'tema',
    points: 50,
    status: 'completed',
    version: 2,
    createdAt: new Date('2026-06-25').toISOString(),
  },
];

export const testActivityInput = {
  child_id: 'child-1',
  family_id: 'family-1',
  title: 'Citit 30 minute',
  type: 'reading',
  points: 30,
};

export const testChildren = [
  { id: 'child-1', name: 'Sofia', points: 100, version: 1, family_id: 'family-1' },
  { id: 'child-2', name: 'Dominic', points: 80, version: 1, family_id: 'family-1' },
];
