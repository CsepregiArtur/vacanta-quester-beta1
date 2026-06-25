/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — Password/PIN Service
 * ==================================
 * Testează hashing-ul și verificarea PIN-urilor cu bcrypt.
 *
 * Funcțiile testate:
 *   - hashPin(pin)
 *   - verifyPin(pin, hash)
 */

import { describe, test, expect } from 'vitest';
import { hashPin, verifyPin } from '../../../server/auth';

describe('Password Service — hashPin', () => {
  test('hash-uie corect un PIN numeric', async () => {
    const hash = await hashPin('1234');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    // Hash-ul bcrypt are 60 caractere și începe cu $2
    expect(hash.length).toBe(60);
    expect(hash.startsWith('$2')).toBe(true);
  });

  test('hash-uie corect un password text', async () => {
    const hash = await hashPin('parola123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('parola123');
  });

  test('hash-uri diferite pentru același input (salt aleator)', async () => {
    const hash1 = await hashPin('0000');
    const hash2 = await hashPin('0000');
    expect(hash1).not.toBe(hash2);
  });
});

describe('Password Service — verifyPin', () => {
  test('verifică un PIN corect', async () => {
    const hash = await hashPin('4321');
    const result = await verifyPin('4321', hash);
    expect(result).toBe(true);
  });

  test('respinge un PIN greșit', async () => {
    const hash = await hashPin('1234');
    const result = await verifyPin('5678', hash);
    expect(result).toBe(false);
  });

  test('respinge un PIN gol', async () => {
    const hash = await hashPin('1234');
    const result = await verifyPin('', hash);
    expect(result).toBe(false);
  });

  test('funcționează cu text în loc de cifre', async () => {
    const hash = await hashPin('parolaMea123');
    const result = await verifyPin('parolaMea123', hash);
    expect(result).toBe(true);
  });

  test('case-sensitive', async () => {
    const hash = await hashPin('ABCdef');
    expect(await verifyPin('ABCdef', hash)).toBe(true);
    expect(await verifyPin('abcdef', hash)).toBe(false);
  });
});
