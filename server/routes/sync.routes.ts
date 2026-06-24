/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync Routes — push/pull/status pentru motorul de sincronizare
 */

import { Router, Request, Response } from "express";
import { syncService } from "../services";
import { authMiddleware } from "../auth";

const router = Router();

// Toate rutele necesită autentificare
router.use(authMiddleware);

/**
 * POST /api/sync/push
 * Clientul trimite acțiuni de sincronizare (offline queue flush)
 */
router.post("/push", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const { actions } = req.body;
    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: " 'actions' trebuie să fie un array." });
    }

    const results: { action: string; success: boolean; error?: string }[] = [];

    for (const item of actions) {
      try {
        const queueItem = await syncService.enqueueSyncAction({
          family_id: familyId,
          action: item.action,
          payload: item.payload,
          device_id: req.headers["x-device-id"] as string,
        });
        results.push({ action: item.action, success: true });
      } catch (err: any) {
        results.push({ action: item.action, success: false, error: err.message });
      }
    }

    // Procesează imediat ce putem (fără să așteptăm)
    syncService.processAllPending().catch(() => {});

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sync/action
 * Acțiune individuală (compatibilitate cu clientul mobil actual)
 */
router.post("/action", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const { action, payload } = req.body;
    if (!action) {
      return res.status(400).json({ error: "'action' este obligatoriu." });
    }

    await syncService.enqueueSyncAction({
      family_id: familyId,
      action,
      payload: payload || {},
      device_id: req.headers["x-device-id"] as string,
    });

    // Procesează imediat
    syncService.processAllPending().catch(() => {});

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sync/pull
 * Clientul trage modificările de la server de la un timestamp
 */
router.get("/pull", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const since = (req.query.since as string) || new Date(0).toISOString();
    const changes = await syncService.getChangesSince(familyId, since);

    res.json({ success: true, ...changes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sync/status
 * Starea cozii de sincronizare pentru familia curentă
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const [pending, processing, failed, completed] = await Promise.all([
      syncService.countByStatus(familyId, "pending"),
      syncService.countByStatus(familyId, "processing"),
      syncService.countByStatus(familyId, "failed"),
      syncService.countByStatus(familyId, "completed"),
    ]);

    res.json({
      success: true,
      queue: { pending, processing, failed, completed, total: pending + processing + failed + completed },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
