/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Device Routes — înregistrare, listare, deconectare dispozitive
 */

import { Router, Request, Response } from "express";
import { syncService } from "../services";
import { authMiddleware } from "../auth";

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/devices/register
 * Înregistrează sau actualizează un dispozitiv
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) return res.status(400).json({ error: "Familia nu a fost identificată." });

    const { device_id, device_name, platform } = req.body;
    if (!device_id) return res.status(400).json({ error: "device_id este obligatoriu." });

    await syncService.upsertDevice({ family_id: familyId, device_id, device_name, platform });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/devices
 * Lista dispozitivelor conectate
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) return res.status(400).json({ error: "Familia nu a fost identificată." });

    const devices = await syncService.getFamilyDevices(familyId);
    res.json({ success: true, devices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/devices/:deviceId
 * Deconectează un dispozitiv de la distanță
 */
router.delete("/:deviceId", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) return res.status(400).json({ error: "Familia nu a fost identificată." });

    const removed = await syncService.removeDevice(familyId, req.params.deviceId);
    res.json({ success: removed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
