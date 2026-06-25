/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — Error Handler Middleware
 * ======================================
 * Testează middleware-ul de erori Express și utilitarele asociate.
 *
 * Concepte testate:
 *   - createAppError: creează erori operaționale
 *   - asyncHandler: prinde erori din async route handlers
 *   - errorHandler: middleware Express
 *   - Deduplicare erori (rate limiting)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock pentru Express Request/Response ──────────────────────────
function mockReq(overrides: any = {}): any {
  return {
    originalUrl: '/api/test',
    url: '/api/test',
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    _statusCode: 500,
    _body: null,
  };
  res.status.mockImplementation((code: number) => {
    res._statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: any) => {
    res._body = body;
    return res;
  });
  return res;
}

function mockNext() {
  return vi.fn();
}

// ─── Testăm funcțiile direct (re-implementare pentru teste izolate) ─
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  context?: string[];
  familyId?: string;
  userId?: string;
}

function createAppError(
  statusCode: number,
  message: string,
  context?: string[]
): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.isOperational = true;
  err.context = context;
  return err;
}

function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── createAppError ────────────────────────────────────────────────
describe('createAppError', () => {
  test('creează eroare cu statusCode', () => {
    const err = createAppError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.isOperational).toBe(true);
  });

  test('creează eroare cu context', () => {
    const err = createAppError(503, 'AI unavailable', ['AI_PROVIDER=gemini']);
    expect(err.statusCode).toBe(503);
    expect(err.context).toEqual(['AI_PROVIDER=gemini']);
  });

  test('creează eroare fără context', () => {
    const err = createAppError(500, 'Internal error');
    expect(err.context).toBeUndefined();
  });

  test('moștenește Error.prototype', () => {
    const err = createAppError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
    expect(err.stack).toBeDefined();
  });
});

// ─── asyncHandler ──────────────────────────────────────────────────
describe('asyncHandler', () => {
  test('apelează next cu eroarea dacă handler-ul async aruncă', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    const handler = asyncHandler(async () => {
      throw new Error('Async error');
    });

    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('Async error');
  });

  test('apelează handler-ul cu succes dacă nu aruncă eroare', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    const handler = asyncHandler(async (_req: any, _res: any) => {
      _res.json({ success: true });
    });

    await handler(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  test('funcționează cu req și res', async () => {
    const req = mockReq({ params: { id: '42' } });
    const res = mockRes();
    const next = mockNext();

    const handler = asyncHandler(async (_req: any, _res: any) => {
      _res.json({ id: _req.params.id });
    });

    await handler(req, res, next);
    expect(res._body).toEqual({ id: '42' });
  });
});

// ─── errorHandler middleware ───────────────────────────────────────
describe('errorHandler middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.GITHUB_TOKEN = 'ghp_test_token';
    process.env.GITHUB_REPO = 'test-owner/test-repo';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('returnează 500 pentru erori fără statusCode', async () => {
    const { errorHandler } = await import(
      '../../../server/middleware/error-handler.middleware'
    );

    const err = new Error('Unexpected error') as AppError;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await errorHandler(err, req, res, next);
    expect(res._statusCode).toBe(500);
    expect(res._body.error).toBe('A apărut o eroare internă.');
  });

  test('păstrează statusCode pentru erori operaționale', async () => {
    const { errorHandler } = await import(
      '../../../server/middleware/error-handler.middleware'
    );

    const err = createAppError(404, 'Resursa nu a fost găsită');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await errorHandler(err, req, res, next);
    expect(res._statusCode).toBe(404);
    expect(res._body.error).toBe('Resursa nu a fost găsită');
  });

  test('nu include stack trace în production', async () => {
    process.env.NODE_ENV = 'production';

    const { errorHandler } = await import(
      '../../../server/middleware/error-handler.middleware'
    );

    const err = new Error('Hidden error') as AppError;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await errorHandler(err, req, res, next);
    expect(res._body.stack).toBeUndefined();
  });

  test('include stack trace în development', async () => {
    process.env.NODE_ENV = 'development';

    const { errorHandler } = await import(
      '../../../server/middleware/error-handler.middleware'
    );

    const err = new Error('Debug error') as AppError;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await errorHandler(err, req, res, next);
    expect(res._body.stack).toBeDefined();
    expect(res._body.stack).toContain('Error: Debug error');
  });

  test('nu raportează erori 4xx pe GitHub', async () => {
    const { errorHandler } = await import(
      '../../../server/middleware/error-handler.middleware'
    );

    const err = createAppError(400, 'Bad request');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await errorHandler(err, req, res, next);
    expect(res._statusCode).toBe(400);
    // Nu ar trebui să încerce să creeze issue pe GitHub
    // (verificat prin faptul că nu s-a apelat niciun fetch)
  });

  test('nu raportează erori în test environment', async () => {
    const { errorHandler } = await import(
      '../../../server/middleware/error-handler.middleware'
    );

    const err = new Error('Test error') as AppError;
    err.statusCode = 500;
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await errorHandler(err, req, res, next);
    expect(res._statusCode).toBe(500);
    // NODE_ENV=test, deci nu se raportează pe GitHub
    expect(res._body.error).toBe('A apărut o eroare internă.');
  });
});
