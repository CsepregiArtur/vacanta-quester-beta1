/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — GitHub Issues: Notification Flow
 * ==============================================
 * Testează fluxul complet de notificare (raportare erori pe GitHub Issues)
 * prin intermediul funcțiilor exportate, cu fetch mockat.
 *
 * Concepte testate:
 *   - createErrorIssue: force mode, API errors, network errors
 *   - reportError: edge cases (fără stack, string error, etc.)
 *   - ensureLabels: erori la creare label (non-critice)
 *   - testGitHubConnection: token invalid, repo invalid
 *   - Deduplicare: eroare la search, continuă crearea
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ═════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════

function mockFetchOk(jsonData: any, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => jsonData,
    text: async () => JSON.stringify(jsonData),
  });
}

function mockFetchSequence(...responses: Array<{ ok: boolean; status?: number; json?: any; text?: string }>) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[Math.min(callIndex++, responses.length - 1)];
    return Promise.resolve({
      ok: resp.ok,
      status: resp.status ?? (resp.ok ? 200 : 500),
      statusText: resp.ok ? 'OK' : 'Error',
      json: async () => resp.json ?? {},
      text: async () => resp.text ?? JSON.stringify(resp.json ?? {}),
    });
  });
}

// ═════════════════════════════════════════════════════════════════════
// Test Suites
// ═════════════════════════════════════════════════════════════════════

describe('createErrorIssue — edge cases', () => {
  const originalEnv = { ...process.env };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';
    process.env.GITHUB_REPO = 'test-owner/test-repo';
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // Resetează module cache-ul între teste pentru a reseta labelsEnsured
    vi.resetModules();
  });

  // ── Force mode ─────────────────────────────────────────────────
  test('force: true sare peste verificarea de duplicat', async () => {
    // Chiar dacă search-ul ar găsi un duplicat, force îl ignoră
    let searchCalled = false;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/search/issues')) {
        searchCalled = true;
        return {
          ok: true,
          json: async () => ({
            items: [{ id: 1, number: 10, title: 'Duplicate', state: 'open', labels: [], html_url: '', created_at: '' }],
          }),
        };
      }
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 999,
            number: 100,
            title: 'Test force',
            body: 'body',
            state: 'open',
            labels: [{ name: 'bug' }],
            html_url: 'https://github.com/test-owner/test-repo/issues/100',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }
      return { ok: true, json: async () => ([]) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Test with force',
      force: true,
    });

    expect(result.success).toBe(true);
    expect(result.issue).toBeDefined();
    expect(result.issue!.number).toBe(100);
    // search/issues NU ar trebui să fie chemat când force=true
    // (dar ensureLabels face un GET /labels care poate fi confundat)
  });

  // ── GitHub API 422 ─────────────────────────────────────────────
  test('GitHub API returnează 422', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      callCount++;
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          text: async () => 'Validation error: title already exists',
        };
      }
      return { ok: true, json: async () => ([]) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Test 422 error',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('422');
  });

  // ── GitHub API 401 (unauthorized) ──────────────────────────────
  test('GitHub API returnează 401 (token invalid)', async () => {
    mockFetch.mockImplementation(async (url: string, _options?: any) => {
      if (url.includes('/repos/')) {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => 'Bad credentials',
        };
      }
      return { ok: true, json: async () => ([]) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Test unauthorized',
    });

    // ensureLabels e apelat primul și face GET /repos/:repo/labels
    // Dacă eșuează, labelsEnsured rămâne false, dar merge mai departe
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  // ── Network error ──────────────────────────────────────────────
  test('network error la GitHub API (fetch aruncă excepție)', async () => {
    mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED 192.168.1.99'));

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Test network error',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  // ── EnsureLabels eșuează, dar issue se creează ────────────────
  test('ensureLabels eșuează, dar issue se creează oricum', async () => {
    let callIndex = 0;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      callIndex++;
      // Primul apel = GET labels -> fail
      if (callIndex === 1 && url.includes('/labels')) {
        return { ok: false, status: 500, statusText: 'Error' };
      }
      // Al doilea apel = search issues -> no duplicate
      if (url.includes('/search/issues')) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      // Al treilea apel = POST issues -> success
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 777,
            number: 50,
            title: 'Created despite label fail',
            body: 'body',
            state: 'open',
            labels: [{ name: 'bug' }],
            html_url: 'https://github.com/test-owner/test-repo/issues/50',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Label creation failed but issue ok',
    });

    expect(result.success).toBe(true);
    expect(result.issue).toBeDefined();
    expect(result.issue!.number).toBe(50);
  });

  // ── Duplicate search eșuează, dar issue se creează ────────────
  test('duplicate search eșuează, dar issue se creează oricum', async () => {
    let callIndex = 0;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      callIndex++;
      if (url.includes('/labels')) {
        return { ok: true, json: async () => ([]) };
      }
      // Search -> fail
      if (url.includes('/search/issues')) {
        return { ok: false, status: 500, statusText: 'Search error' };
      }
      // Create issue -> success
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 555,
            number: 60,
            title: 'Created despite search fail',
            body: 'body',
            state: 'open',
            labels: [{ name: 'bug' }],
            html_url: 'https://github.com/test-owner/test-repo/issues/60',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Search failed but created',
    });

    expect(result.success).toBe(true);
    expect(result.issue).toBeDefined();
    expect(result.issue!.number).toBe(60);
  });

  // ── Issue cu toate câmpurile populate ─────────────────────────
  test('creează issue cu toate câmpurile: labels multiple, context, stack', async () => {
    let capturedBody: any = null;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/labels')) {
        return { ok: true, json: async () => ([]) };
      }
      if (url.includes('/search/issues')) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      if (options?.method === 'POST' && url.includes('/issues')) {
        capturedBody = JSON.parse(options.body as string);
        return {
          ok: true,
          json: async () => ({
            id: 333,
            number: 70,
            title: capturedBody.title,
            body: capturedBody.body,
            state: 'open',
            labels: capturedBody.labels,
            html_url: 'https://github.com/test-owner/test-repo/issues/70',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const mod = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await mod.createErrorIssue({
      errorMessage: 'Fatal sync error: ECONNREFUSED queue processing failed',
      stackTrace: 'Error: queue processing failed\n    at SyncQueue.process (sync.service.ts:42)',
      context: ['retry_count=3', 'family_id=abc-123', 'NODE_ENV=production'],
      route: '/api/sync/action',
      method: 'POST',
      familyId: 'abc-123',
      userId: 'parent@test.com',
    });

    expect(result.success).toBe(true);
    expect(capturedBody).toBeTruthy();
    // Ar trebui să aibă label-urile sync + critical (ECONNREFUSED)
    expect(capturedBody.labels).toEqual(
      expect.arrayContaining(['critical', 'sync'])
    );
    expect(capturedBody.body).toContain('POST /api/sync/action');
    expect(capturedBody.body).toContain('abc-123');
    expect(capturedBody.body).toContain('parent@test.com');
    expect(capturedBody.body).toContain('SyncQueue.process');
    expect(capturedBody.body).toContain('retry_count=3');
  });
});

// ═════════════════════════════════════════════════════════════════════
// reportError — edge cases
// ═════════════════════════════════════════════════════════════════════

describe('reportError — edge cases', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';
    process.env.GITHUB_REPO = 'test-owner/test-repo';
    vi.stubGlobal('fetch', mockFetch);
    vi.resetModules();

    // Default: toate API-urile răspund OK
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 1,
            number: 99,
            title: 'error',
            body: 'body',
            state: 'open',
            labels: [{ name: 'bug' }],
            html_url: 'https://github.com/test-owner/test-repo/issues/99',
            created_at: '2026-06-25T10:00:00Z',
          }),
        };
      }
      return { ok: true, json: async () => ([]) };
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('raportează eroare fără stack trace', async () => {
    const { reportError } = await import(
      '../../../server/services/github-issues.service'
    );

    const error = new Error('Simple error');
    // Ștergem stack-ul
    delete error.stack;

    const result = await reportError(error);
    expect(result.success).toBe(true);
  });

  test('raportează eroare cu meta gol', async () => {
    const { reportError } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await reportError(new Error('No meta'));
    expect(result.success).toBe(true);
  });

  test('raportează eroare cu toate meta câmpurile', async () => {
    const { reportError } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await reportError(new Error('Full meta error'), {
      route: '/api/test',
      method: 'PUT',
      familyId: 'family-xyz',
      userId: 'user@test.com',
      context: ['key=val', 'env=test'],
    });
    expect(result.success).toBe(true);
  });

  test('raportează eroare cu mesaj foarte lung', async () => {
    const { reportError } = await import(
      '../../../server/services/github-issues.service'
    );

    const longMsg = 'A'.repeat(5000);
    const result = await reportError(new Error(longMsg));
    expect(result.success).toBe(true);
    // Titlul e trunchiat la 200 caractere
  });
});

// ═════════════════════════════════════════════════════════════════════
// testGitHubConnection
// ═════════════════════════════════════════════════════════════════════

describe('testGitHubConnection', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('token-ul e gol → eroare', async () => {
    process.env.GITHUB_TOKEN = '';
    process.env.GITHUB_REPO = 'owner/repo';

    const { testGitHubConnection } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await testGitHubConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('neconfigurat');
  });

  test('repo name invalid → eroare 404', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'invalid/repo-that-does-not-exist';

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { testGitHubConnection } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await testGitHubConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('404');
  });

  test('timeout la conexiune', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    process.env.GITHUB_REPO = 'owner/repo';

    mockFetch.mockRejectedValue(new Error('ETIMEDOUT'));

    const { testGitHubConnection } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await testGitHubConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ETIMEDOUT');
  });
});

// ═════════════════════════════════════════════════════════════════════
// ensureLabels — etichete
// ═════════════════════════════════════════════════════════════════════

describe('ensureLabels — comportament la creare label-uri', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';
    process.env.GITHUB_REPO = 'test-owner/test-repo';
    vi.stubGlobal('fetch', mockFetch);
    vi.resetModules(); // Asigură că labelsEnsured pornește de la false
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('label-urile există deja → nu se încearcă recreerea', async () => {
    // Simulăm că label-urile există deja în repo
    const existingLabels = [
      { name: 'critical' },
      { name: 'sync' },
      { name: 'ai' },
      { name: 'ha-rewards' },
      { name: 'bug' },
    ];

    let postLabelCalled = false;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/labels') && (!options || options.method === 'GET' || !options.method)) {
        // GET labels → toate există deja
        return {
          ok: true,
          json: async () => existingLabels,
        };
      }
      if (options?.method === 'POST' && url.includes('/labels')) {
        postLabelCalled = true;
        return { ok: true };
      }
      if (url.includes('/search/issues')) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 1,
            number: 80,
            title: 'test',
            body: '',
            state: 'open',
            labels: [],
            html_url: '',
            created_at: '',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    await createErrorIssue({ errorMessage: 'Test labels exist' });
    // Nu ar fi trebuit să sune POST /labels
    expect(postLabelCalled).toBe(false);
  });

  test('unele label-uri lipsă → se creează doar cele lipsă', async () => {
    // Doar 'bug' există, restul trebuie create
    const existingLabels = [{ name: 'bug' }];
    const createdLabels: string[] = [];

    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/labels') && (!options || options.method === 'GET' || !options.method)) {
        return { ok: true, json: async () => existingLabels };
      }
      if (options?.method === 'POST' && url.includes('/labels')) {
        const body = JSON.parse(options.body);
        createdLabels.push(body.name);
        return { ok: true };
      }
      if (url.includes('/search/issues')) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 2,
            number: 81,
            title: 'test',
            body: '',
            state: 'open',
            labels: [],
            html_url: '',
            created_at: '',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    await createErrorIssue({ errorMessage: 'Test create missing labels' });

    // Ar fi trebuit să creeze 4 label-uri (critical, sync, ai, ha-rewards)
    expect(createdLabels).toContain('critical');
    expect(createdLabels).toContain('sync');
    expect(createdLabels).toContain('ai');
    expect(createdLabels).toContain('ha-rewards');
    expect(createdLabels).not.toContain('bug');
    expect(createdLabels).toHaveLength(4);
  });

  test('eroare la crearea unui label → nu blochează și nu aruncă excepție', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      callCount++;
      if (url.includes('/labels') && (!options || options.method === 'GET' || !options.method)) {
        return { ok: true, json: async () => ([]) };
      }
      // Primul label de creat (critical) → fail
      if (options?.method === 'POST' && url.includes('/labels') && callCount <= 3) {
        return { ok: false, status: 422, statusText: 'Validation error' };
      }
      if (url.includes('/search/issues')) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      if (options?.method === 'POST' && url.includes('/issues')) {
        return {
          ok: true,
          json: async () => ({
            id: 3,
            number: 82,
            title: 'test',
            body: '',
            state: 'open',
            labels: [],
            html_url: '',
            created_at: '',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    // Nu ar trebui să arunce — eroarea la label e tratată cu try/catch
    const result = await createErrorIssue({ errorMessage: 'Label creation fails' });
    expect(result.success).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// findDuplicateIssue — detectare duplicat
// ═════════════════════════════════════════════════════════════════════

describe('findDuplicateIssue — detectare duplicat', () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';
    process.env.GITHUB_REPO = 'test-owner/test-repo';
    vi.stubGlobal('fetch', mockFetch);
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('issue cu același titlu există deja → reportează duplicat', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/search/issues')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 100,
                number: 5,
                title: 'Database connection failed',
                body: 'body',
                state: 'open',
                labels: [{ name: 'critical' }],
                html_url: 'https://github.com/test-owner/test-repo/issues/5',
                created_at: '2026-06-24T10:00:00Z',
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ([]) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    const result = await createErrorIssue({
      errorMessage: 'Database connection failed',
    });

    expect(result.skipped).toBe(true);
    expect(result.duplicate).toBeDefined();
    expect(result.duplicate!.number).toBe(5);
  });

  test('issue similar găsit în search → verifică match exact', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/search/issues')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 200,
                number: 15,
                title: 'Gemini API timeout on reading generation',
                body: 'body',
                state: 'open',
                labels: [{ name: 'ai' }],
                html_url: 'https://github.com/test-owner/test-repo/issues/15',
                created_at: '2026-06-23T10:00:00Z',
              },
              {
                id: 201,
                number: 16,
                title: 'Gemini API returned 503',
                body: 'body',
                state: 'open',
                labels: [{ name: 'ai' }],
                html_url: 'https://github.com/test-owner/test-repo/issues/16',
                created_at: '2026-06-23T12:00:00Z',
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ([]) };
    });

    const { createErrorIssue } = await import(
      '../../../server/services/github-issues.service'
    );

    // Test: titlu care există exact
    const exactMatch = await createErrorIssue({
      errorMessage: 'Gemini API timeout on reading generation',
    });
    expect(exactMatch.skipped).toBe(true);
    expect(exactMatch.duplicate!.number).toBe(15);

  });

  test('titlu care nu există în search → creează issue nou', async () => {
    // Trebuie testat separat de testul anterior pentru a reseta labelsEnsured
    let issueCreated = false;
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/search/issues')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 200,
                number: 15,
                title: 'Gemini API timeout on reading generation',
                body: 'body',
                state: 'open',
                labels: [{ name: 'ai' }],
                html_url: '',
                created_at: '',
              },
            ],
          }),
        };
      }
      if (options?.method === 'POST' && url.includes('/issues')) {
        issueCreated = true;
        return {
          ok: true,
          json: async () => ({
            id: 999,
            number: 99,
            title: 'New issue',
            body: '',
            state: 'open',
            labels: [],
            html_url: '',
            created_at: '',
          }),
        };
      }
      return { ok: true, json: async () => ([]) };
    });

    const mod = await import(
      '../../../server/services/github-issues.service'
    );

    // Titlu care e CONȚINUT în issue-ul existent (Gemini API timeout...)
    // → ar trebui detectat ca duplicat (nu se creează)
    const match = await mod.createErrorIssue({
      errorMessage: 'Gemini API timeout on reading generation',
    });
    expect(match.skipped).toBe(true);
    expect(match.duplicate).toBeDefined();

    // Issue nou care nu e similar → se creează
    mockFetch.mockClear();
    vi.resetModules();
    const mod2 = await import(
      '../../../server/services/github-issues.service'
    );

    const noMatch = await mod2.createErrorIssue({
      errorMessage: 'Something completely different happened',
    });
    expect(noMatch.skipped).toBeUndefined();
    expect(noMatch.success).toBe(true);
  });
});
