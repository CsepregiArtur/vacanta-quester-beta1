/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth Middleware — verifică JWT Bearer token
 */

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth";

declare global {
  namespace Express {
    interface Request {
      user?: { email: string; name: string };
      familyId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de acces lipsă!" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Token invalid sau expirat!" });
    return;
  }

  req.user = decoded;
  next();
}
