/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test Fixtures — Utilizatori
 */

export const testUsers = {
  parent: {
    email: 'parent@example.com',
    name: 'Test Parent',
    pin: '1234',
    familyId: 'family-1',
    role: 'parent' as const,
  },
  child: {
    email: 'child@example.com',
    name: 'Test Child',
    pin: '5678',
    familyId: 'family-1',
    role: 'child' as const,
  },
};

export const testParentCredentials = {
  email: 'parent@test.com',
  name: 'Părinte Test',
  pin: '4321',
};

export const testNewUser = {
  email: 'nou@test.com',
  name: 'Utilizator Nou',
  pin: '0000',
};
