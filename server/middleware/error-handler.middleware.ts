/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Error Handler Middleware — prinde erorile globale și le raportează
 * ================================================================
 * Se montează La sfârșitul lanțului de middleware, DUPĂ toate rutele.
 * 
 * Comportament:
 *   1. Loghează eroarea în consolă
 *   2. Trimite issue pe GitHub (dacă GITHUB_TOKEN e configurat)
 *   3. Returnează răspuns JSON standardizat
 */

import { Request, Response, NextFunction } from "express";
import { createErrorIssue } from "../services/github-issues.service";

// Colectăm erori recente pentru a nu spam GitHub cu aceeași eroare
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000; // 1 minut

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  context?: string[];
  familyId?: string;
  userId?: string;
}

/**
 * Middleware principal de erori.
 * Montează: app.use(errorHandler);
 */
export async function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  // Determină codul HTTP
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "A apărut o eroare internă.";

  // Log în consolă
  console.error(`[ERROR] ${statusCode} — ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Raportează la GitHub (doar pentru 5xx — erori de server)
  if (statusCode >= 500 && process.env.NODE_ENV !== "test") {
    const errorKey = `${err.message}:${err.stack?.substring(0, 100)}`;

    // Deduplicare: aceeași eroare nu se raportează mai des de 1/minut
    const lastReport = recentErrors.get(errorKey);
    const now = Date.now();

    if (!lastReport || now - lastReport > DEDUP_WINDOW_MS) {
      recentErrors.set(errorKey, now);

      // Curăță intrări vechi (prevenim memory leak)
      if (recentErrors.size > 100) {
        const expiry = now - DEDUP_WINDOW_MS;
        for (const [key, ts] of recentErrors) {
          if (ts < expiry) recentErrors.delete(key);
        }
      }

      // Raportare asincronă — nu blocăm răspunsul
      createErrorIssue({
        errorMessage: err.message,
        stackTrace: err.stack,
        context: [
          ...(err.context || []),
          `NODE_ENV=${process.env.NODE_ENV || "development"}`,
        ],
        route: req.originalUrl || req.url,
        method: req.method,
        familyId: err.familyId || (req as any).familyId,
        userId: err.userId || (req as any).user?.email,
      }).catch((reportErr) => {
        console.error("[ERROR-HANDLER] GitHub report failed:", reportErr.message);
      });
    }
  }

  // Răspuns JSON standardizat
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

/**
 * Utility: creează o eroare operațională (așteptată) cu status code.
 * 
 * ```ts
 * throw createAppError(404, "Resursa nu a fost găsită");
 * throw createAppError(503, "AI Service indisponibil", ["AI_PROVIDER=gemini"]);
 * ```
 */
export function createAppError(
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

/**
 * Wrapper pentru async route handlers — prinde erorile și le pasa la next().
 * 
 * ```ts
 * app.get("/api/example", asyncHandler(async (req, res) => {
 *   const data = await riskyOperation();
 *   res.json(data);
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
