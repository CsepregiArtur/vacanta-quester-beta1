/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics Routes — interogare evenimente business
 */

import { Router, Request, Response } from "express";
import { analyticsService } from "../services";
import { authenticateToken } from "../auth";

const router = Router();

// Toate rutele necesită autentificare
router.use(authenticateToken);

/**
 * GET /api/analytics/events
 * Listare evenimente recente pentru familia utilizatorului
 */
router.get("/events", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await analyticsService.getRecentEvents(familyId, limit);
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/summary
 * Rezumat agregat pe tipuri de evenimente
 */
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const since = req.query.since
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // ultimele 30 zile

    const breakdown = await analyticsService.getEventBreakdown(familyId, since);
    const total = breakdown.reduce((sum, b) => sum + b.count, 0);

    res.json({ success: true, total, since: since.toISOString(), breakdown });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/analytics/track
 * Endpoint pentru frontend — înregistrează un eveniment de pe client
 */
router.post("/track", async (req: Request, res: Response) => {
  try {
    const { eventName, childId, properties } = req.body;
    const familyId = (req as any).user?.familyId;

    if (!eventName) {
      return res.status(400).json({ error: "eventName este obligatoriu." });
    }

    await analyticsService.trackEvent({
      eventName,
      familyId: familyId || null,
      childId: childId || null,
      properties: properties || {},
      source: "web",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
