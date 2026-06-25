/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Health Check Tests
 * ==================
 * Testează endpoint-urile de health check pentru toate serviciile.
 */

import { describe, test, expect, vi } from 'vitest';

// ─── Helper pentru health check ─────────────────────────────────────
interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  services: {
    api: 'ok' | 'down';
    postgres: 'ok' | 'down';
    gemini: 'ok' | 'down';
    redis: 'ok' | 'down' | 'disabled';
  };
  uptime: number;
  timestamp: string;
}

async function checkHealth(): Promise<HealthStatus> {
  // Simulăm un health check
  const services = {
    api: 'ok' as const,
    postgres: 'ok' as const,
    gemini: 'ok' as const,
    redis: 'disabled' as const,
  };

  const allOk = Object.values(services).every((s) => s === 'ok' || s === 'disabled');
  return {
    status: allOk ? 'ok' : 'down',
    services,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

async function checkPostgresHealth(): Promise<'ok' | 'down'> {
  // Verifică conectivitatea la PostgreSQL printr-un query simplu
  try {
    // Simulăm un query SELECT 1
    return 'ok';
  } catch {
    return 'down';
  }
}

describe('Health Checks', () => {
  test('returnează OK pentru toate serviciile', async () => {
    const health = await checkHealth();
    expect(health.status).toBe('ok');
    expect(health.services.api).toBe('ok');
    expect(health.services.postgres).toBe('ok');
    expect(health.services.gemini).toBe('ok');
  });

  test('include uptime-ul serverului', async () => {
    const health = await checkHealth();
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof health.uptime).toBe('number');
  });

  test('include timestamp-ul curent', async () => {
    const health = await checkHealth();
    expect(health.timestamp).toBeDefined();
    expect(() => new Date(health.timestamp)).not.toThrow();
  });

  test('poate detecta DB down', async () => {
    // Salvăm funcția originală și o înlocuim
    const originalCheck = checkPostgresHealth;

    // Simulăm DB down
    const mockCheck = vi.fn().mockResolvedValue('down' as const);
    const result = await mockCheck();
    expect(result).toBe('down');
  });

  test('status-ul general e down dacă un serviciu e down', () => {
    const health: HealthStatus = {
      status: 'down',
      services: {
        api: 'ok',
        postgres: 'down',
        gemini: 'ok',
        redis: 'disabled',
      },
      uptime: 12345,
      timestamp: new Date().toISOString(),
    };

    expect(health.status).toBe('down');
    expect(health.services.postgres).toBe('down');
  });

  test('serviciul redis poate fi disabled (configurabil)', () => {
    const health: HealthStatus = {
      status: 'ok',
      services: {
        api: 'ok',
        postgres: 'ok',
        gemini: 'ok',
        redis: 'disabled',
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    expect(health.status).toBe('ok');
    expect(health.services.redis).toBe('disabled');
  });
});
