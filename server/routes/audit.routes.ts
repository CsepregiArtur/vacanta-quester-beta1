/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Audit Routes — vizualizare jurnal de audit
 */

import { Router, Request, Response } from "express";
import { auditService } from "../services";
import { authMiddleware } from "../auth";

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/audit
 * Jurnalul de audit al familiei
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) return res.status(400).json({ error: "Familia nu a fost identificată." });

    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const logs = await auditService.getFamilyAuditLog(familyId, limit, offset);

    res.json({ success: true, logs, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
