/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — JWT Service
 * =========================
 * Testează generarea, verificarea și reîmprospătarea token-urilor JWT.
 *
 * Funcțiile testate sunt exportate din server/auth.ts (care face re-export din legacy/auth.ts):
 *   - generateAccessToken(email, name)
 *   - verifyAccessToken(token)
 *   - generateRefreshToken(email)
 *   - refreshTokens(refreshToken)
 *   - revokeRefreshToken(token)
 */

import { describe, test, expect, beforeAll } from 'vitest';
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  refreshTokens,
  revokeRefreshToken,
} from '../../../server/auth';

describe('JWT Service — generateAccessToken', () => {
  test('creează un token valid în format JWT', () => {
    const token = generateAccessToken('test@example.com', 'Test User');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    // JWT-urile încep cu eyJ (Base64 pentru JSON)
    expect(token).toMatch(/^eyJ/);
  });

  test('token-ul conține email-ul corect', () => {
    const token = generateAccessToken('user@test.com', 'User');
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.email).toBe('user@test.com');
  });

  test('token-ul conține numele corect', () => {
    const token = generateAccessToken('a@b.com', 'Ana');
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe('Ana');
  });

  test('token-urile conțin email-ul corect și sunt valide', () => {
    const token1 = generateAccessToken('same@test.com', 'Same');
    const token2 = generateAccessToken('same@test.com', 'Same');
    // Ambele token-uri sunt valide și conțin email-ul corect
    expect(verifyAccessToken(token1)!.email).toBe('same@test.com');
    expect(verifyAccessToken(token2)!.email).toBe('same@test.com');
  });
});

describe('JWT Service — verifyAccessToken', () => {
  test('validează un token corect', () => {
    const token = generateAccessToken('valid@test.com', 'Valid');
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.email).toBe('valid@test.com');
    expect(decoded!.name).toBe('Valid');
  });

  test('returnează null pentru token invalid', () => {
    const result = verifyAccessToken('invalid-token-here');
    expect(result).toBeNull();
  });

  test('returnează null pentru token falsificat', () => {
    const result = verifyAccessToken('eyJhbGciOiJIUzI1NiJ9.fake.d2xvbmdz');
    expect(result).toBeNull();
  });

  test('returnează null pentru token gol', () => {
    expect(verifyAccessToken('')).toBeNull();
  });
});

describe('JWT Service — generateRefreshToken', () => {
  test('creează un refresh token valid', async () => {
    const token = await generateRefreshToken('refresh@test.com');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^eyJ/);
  });

  test('permite generarea mai multor token-uri pentru același user', async () => {
    const token1 = await generateRefreshToken('multi@test.com');
    const token2 = await generateRefreshToken('multi@test.com');
    expect(token1).not.toBe(token2);
  });

  test('acceptă deviceInfo opțional', async () => {
    const token = await generateRefreshToken('device@test.com', 'iPhone-15');
    expect(token).toBeDefined();
  });
});

describe('JWT Service — refreshTokens', () => {
  test('generează tokeni noi dintr-un refresh token valid', async () => {
    const oldToken = await generateRefreshToken('rotate@test.com');
    const result = await refreshTokens(oldToken);
    expect(result).not.toBeNull();
    expect(result!.accessToken).toBeDefined();
    expect(result!.refreshToken).toBeDefined();
    expect(result!.email).toBe('rotate@test.com');
    // Token rotation: noul access token e diferit de cel vechi
    expect(result!.refreshToken).not.toBe(oldToken);
  });

  test('returnează null pentru refresh token invalid', async () => {
    const result = await refreshTokens('invalid-refresh-token');
    expect(result).toBeNull();
  });

  test('generează tokeni noi și păstrează email-ul corect', async () => {
    const oldToken = await generateRefreshToken('rotate@test.com');
    const result = await refreshTokens(oldToken);
    expect(result).not.toBeNull();
    expect(result!.email).toBe('rotate@test.com');
    // Noul refresh token e diferit de cel vechi
    expect(result!.refreshToken).not.toBe(oldToken);
  });
});

describe('JWT Service — revokeRefreshToken', () => {
  test('invalidează un refresh token', async () => {
    const token = await generateRefreshToken('revoke@test.com');
    await revokeRefreshToken(token);
    const result = await refreshTokens(token);
    expect(result).toBeNull();
  });

  test('nu crapă la revoke cu token inexistent', async () => {
    await expect(revokeRefreshToken('fake-token')).resolves.not.toThrow();
  });
});
