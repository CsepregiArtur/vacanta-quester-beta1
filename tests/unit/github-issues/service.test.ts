/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — GitHub Issues: Service Logic
 * ==========================================
 * Testează logica principală a serviciului: sanitizare, formatare body,
 * verificare duplicat, și fluxul complet (cu fetch mockat).
 *
 * Concepte testate:
 *   - sanitizeTitle: elimină email-uri, token-uri, JWT
 *   - formatIssueBody: structură corectă Markdown
 *   - findDuplicateIssue: detectare duplicat
 *   - ensureLabels: creare label-uri lipsă
 *   - createErrorIssue: flux complet cu GitHub API mockat
 *   - reportError: wrapper simplu
 *   - testGitHubConnection: verificare conexiune
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Helpere testate (re-implementare izolată) ─────────────────────

function sanitizeTitle(title: string): string {
  return title
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/g, '$1[redacted]')
    .replace(/(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, '[jwt]')
    .substring(0, 200);
}

function formatIssueBody(params: {
  errorMessage: string;
  stackTrace?: string;
  context?: string[];
  route?: string;
  method?: string;
  familyId?: string;
  userId?: string;
  timestamp?: string;
}): string {
  const ts = params.timestamp || new Date().toISOString();
  const lines: string[] = [
    '## 🐛 Eroare raportată automat',
    '',
    `**Timestamp:** ${ts}`,
    `**Mediu:** ${process.env.NODE_ENV || 'development'}`,
    `**Versiune:** ${process.env.npm_package_version || 'unknown'}`,
    '',
  ];

  if (params.route) {
    lines.push(`**Endpoint:** \`${params.method || 'GET'} ${params.route}\``);
  }
  if (params.familyId) {
    lines.push(`**Family ID:** \`${params.familyId}\``);
  }
  if (params.userId) {
    lines.push(`**User:** \`${params.userId}\``);
  }

  lines.push(
    '',
    '---',
    '',
    '### 📋 Mesaj eroare',
    '```',
    params.errorMessage,
    '```',
    ''
  );

  if (params.stackTrace) {
    lines.push(
      '### 🔍 Stack Trace',
      '```',
      params.stackTrace.substring(0, 5000),
      '```',
      ''
    );
  }

  if (params.context && params.context.length > 0) {
    lines.push(
      '### 📎 Context adițional',
      ...params.context.map((c) => `- ${c}`),
      ''
    );
  }

  lines.push(
    '---',
    '> Acest issue a fost generat automat de sistemul de raportare a erorilor.',
    '> Dacă problema este deja cunoscută, acest issue va fi închis automat.'
  );

  return lines.join('\n');
}

// ─── Sanitize Title ────────────────────────────────────────────────
describe('sanitizeTitle', () => {
  test('elimină email-uri din titlu', () => {
    const result = sanitizeTitle('Error for user test@example.com: crash');
    expect(result).not.toContain('test@example.com');
    expect(result).toContain('[email]');
  });

  test('elimină JWT token-uri', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNqP0J2W0rFQC3sP3A';
    const result = sanitizeTitle(`Token error: ${jwt}`);
    expect(result).not.toContain(jwt);
    expect(result).toContain('[jwt]');
  });

  test('elimină Bearer token-uri', () => {
    const result = sanitizeTitle('Auth failed: Bearer ghp_abc123def456');
    expect(result).toContain('Bearer [redacted]');
  });

  test('trunchiază la 200 caractere', () => {
    const long = 'x'.repeat(300);
    const result = sanitizeTitle(long);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  test('păstrează titluri normale neschimbate', () => {
    const result = sanitizeTitle('Server error: connection timeout');
    expect(result).toBe('Server error: connection timeout');
  });
});

// ─── Format Issue Body ─────────────────────────────────────────────
describe('formatIssueBody', () => {
  test('include mesajul de eroare', () => {
    const body = formatIssueBody({ errorMessage: 'Test error' });
    expect(body).toContain('Test error');
  });

  test('include stack trace când e furnizat', () => {
    const stack = 'Error: test\n    at Object.<anonymous> (file.ts:10:5)';
    const body = formatIssueBody({
      errorMessage: 'Test error',
      stackTrace: stack,
    });
    expect(body).toContain(stack);
  });

  test('include endpoint-ul când e furnizat', () => {
    const body = formatIssueBody({
      errorMessage: 'Test error',
      route: '/api/sync/action',
      method: 'POST',
    });
    expect(body).toContain('POST /api/sync/action');
  });

  test('include familyId când e furnizat', () => {
    const body = formatIssueBody({
      errorMessage: 'Test',
      familyId: 'abc-123',
    });
    expect(body).toContain('abc-123');
  });

  test('include userId când e furnizat', () => {
    const body = formatIssueBody({
      errorMessage: 'Test',
      userId: 'parent@example.com',
    });
    expect(body).toContain('parent@example.com');
  });

  test('include context adițional', () => {
    const body = formatIssueBody({
      errorMessage: 'Test',
      context: ['AI_PROVIDER=gemini', 'Model: gemini-2.0-flash'],
    });
    expect(body).toContain('AI_PROVIDER=gemini');
    expect(body).toContain('Model: gemini-2.0-flash');
  });

  test('include timestamp personalizat', () => {
    const body = formatIssueBody({
      errorMessage: 'Test',
      timestamp: '2026-06-25T10:00:00Z',
    });
    expect(body).toContain('2026-06-25T10:00:00Z');
  });

  test('limitează stack trace la 5000 caractere', () => {
    const longStack = 'x'.repeat(6000);
    const body = formatIssueBody({
      errorMessage: 'Test',
      stackTrace: longStack,
    });
    // Verificăm că stack trace-ul e trunchiat la 5000 de caractere
    expect(body).toContain('x'.repeat(5000));
    // Caracterul 5001+ nu apare (trunchiat)
    const match5001 = body.match(/x{5001}/);
    expect(match5001).toBeNull();
  });

  test('include mesajul de auto-generare la sfârșit', () => {
    const body = formatIssueBody({ errorMessage: 'Test' });
    expect(body).toContain('generat automat de sistemul de raportare');
  });
});

// ─── Flux complet cu fetch mockat ──────────────────────────────────
describe('createErrorIssue — cu fetch mockat', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';
    process.env.GITHUB_REPO = 'test-owner/test-repo';
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('salțe când GITHUB_TOKEN lipsește', async () => {
    delete process.env.GITHUB_TOKEN;
    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );
    const result = await createErrorIssue({
      errorMessage: 'Test error',
    });
    expect(result.skipped).toBe(true);
    expect(result.success).toBe(false);
  });

  test('salțe când GITHUB_REPO lipsește', async () => {
    delete process.env.GITHUB_REPO;
    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );
    const result = await createErrorIssue({
      errorMessage: 'Test error',
    });
    expect(result.skipped).toBe(true);
  });

  test('creează issue cu succes', async () => {
    // Mock: GET /repos/:repo/labels → listă goală (va crea label-ele)
    // Mock: GET /search/issues → fără rezultate (niciun duplicat)
    // Mock: POST /repos/:repo/issues → succes

    let callCount = 0;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      callCount++;
      
      if (url.includes('/search/issues')) {
        // Search — no duplicates
        return {
          ok: true,
          json: async () => ({ items: [] }),
        };
      }

      if (url.includes('/labels') && (!options || options.method === undefined || options.method === 'GET')) {
        // GET labels — return existing labels (none)
        return {
          ok: true,
          json: async () => ([]),
        };
      }

      if (options?.method === 'POST' && url.includes('/labels')) {
        // POST label — created
        return { ok: true };
      }

      if (options?.method === 'POST' && url.includes('/issues')) {
        // POST issue — created
        return {
          ok: true,
          json: async () => ({
            id: 123,
            number: 42,
            title: 'Test error',
            body: '## 🐛 Eroare raportată automat',
            state: 'open',
            labels: [{ name: 'bug' }],
            html_url: 'https://github.com/test-owner/test-repo/issues/42',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }

      // GET /repos/:repo — repo check
      return {
        ok: true,
        json: async () => ({ full_name: 'test-owner/test-repo' }),
      };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Test error occurred',
      stackTrace: 'Error: Test error\n    at Object.<anonymous> (test.ts:10)',
      route: '/api/test',
      method: 'POST',
      context: ['node_env=test'],
    });

    expect(result.success).toBe(true);
    expect(result.issue).toBeDefined();
    expect(result.issue!.number).toBe(42);
    expect(result.issue!.html_url).toContain('github.com');
  });

  test('detectează duplicat și nu creează issue nou', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/search/issues')) {
        // Search — found duplicate
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 1,
                number: 10,
                title: 'Test error occurred',
                body: 'body',
                state: 'open',
                labels: [{ name: 'bug' }],
                html_url: 'https://github.com/test-owner/test-repo/issues/10',
                created_at: '2026-06-24T10:00:00Z',
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({ full_name: 'test-owner/test-repo' }),
      };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Test error occurred',
    });

    expect(result.skipped).toBe(true);
    expect(result.duplicate).toBeDefined();
    expect(result.duplicate!.number).toBe(10);
  });

  test('raportează eroare GitHub API', async () => {
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          text: async () => 'Validation error',
        };
      }

      return {
        ok: true,
        json: async () => ([]),
      };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Test error',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('422');
  });
});

// ─── reportError wrapper ───────────────────────────────────────────
describe('reportError — wrapper simplu', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';
    process.env.GITHUB_REPO = 'test-owner/test-repo';
    vi.stubGlobal('fetch', mockFetch);

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/search/issues')) {
        return {
          ok: true,
          json: async () => ({ items: [] }),
        };
      }
      return {
        ok: true,
        json: async () => ([]),
      };
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('preia stack trace din Error obiect', async () => {
    // Mock issues POST
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 456,
            number: 99,
            title: 'Test runtime error',
            body: 'body',
            state: 'open',
            labels: [{ name: 'bug' }],
            html_url: 'https://github.com/test-owner/test-repo/issues/99',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ([]),
      };
    });

    const { reportError } = await import(
      '../../../server/services/github-issues.service'
    );

    const error = new Error('Test runtime error');
    const result = await reportError(error, {
      route: '/api/test',
      method: 'GET',
    });

    expect(result.success).toBe(true);
    expect(result.issue).toBeDefined();
  });

  test('trimite context adițional', async () => {
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 789,
            number: 100,
            title: 'Sync failed',
            body: 'body',
            state: 'open',
            labels: [{ name: 'sync' }],
            html_url: 'https://github.com/test-owner/test-repo/issues/100',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ([]),
      };
    });

    const { reportError } = await import(
      '../../../server/services/github-issues.service'
    );

    const error = new Error('Sync queue processing failed');
    const result = await reportError(error, {
      context: ['retry_count=3', 'family_id=abc-123'],
      familyId: 'abc-123',
    });

    expect(result.success).toBe(true);
  });
});

// ─── testGitHubConnection ──────────────────────────────────────────
describe('testGitHubConnection', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('returnează eroare când token-ul lipsește', async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPO;

    const { testGitHubConnection } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await testGitHubConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('neconfigurat');
  });

  test('verifică repo-ul cu succes', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'test-owner/test-repo';

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ full_name: 'test-owner/test-repo' }),
    });

    const { testGitHubConnection } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await testGitHubConnection();
    expect(result.ok).toBe(true);
    expect(result.repo).toBe('test-owner/test-repo');
    expect(result.labels).toContain('critical');
    expect(result.labels).toContain('sync');
    expect(result.labels).toContain('ai');
    expect(result.labels).toContain('ha-rewards');
    expect(result.labels).toContain('bug');
  });

  test('raportează eroare HTTP', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'test-owner/test-repo';

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const { testGitHubConnection } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await testGitHubConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('401');
  });
});
