/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Subscription Routes — gestiune abonamente
 */

import { Router, Request, Response } from "express";
import { query } from "../db";
import { analyticsService } from "../services";
import { authenticateToken } from "../auth";

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/subscription/status
 * Starea abonamentului pentru familia curentă
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const { rows } = await query(
      `SELECT id, name, subscription_type, created_at FROM families WHERE id = $1`,
      [familyId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "Familia nu a fost găsită." });
    }

    res.json({ success: true, subscription: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/subscription
 * Schimbă tipul abonamentului (free → premium → enterprise)
 */
router.put("/", async (req: Request, res: Response) => {
  try {
    const familyId = (req as any).user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: "Familia nu a fost identificată." });
    }

    const { subscriptionType } = req.body;
    if (!subscriptionType || !["free", "premium", "enterprise"].includes(subscriptionType)) {
      return res.status(400).json({ error: "Tipul de abonament trebuie să fie free, premium sau enterprise." });
    }

    // Obține vechiul abonament
    const { rows: [oldFamily] } = await query(
      `SELECT subscription_type FROM families WHERE id = $1`,
      [familyId]
    );
    if (!oldFamily) {
      return res.status(404).json({ error: "Familia nu a fost găsită." });
    }

    // Actualizează
    await query(
      `UPDATE families SET subscription_type = $1 WHERE id = $2`,
      [subscriptionType, familyId]
    );

    // Analytics
    const isUpgrade =
      (oldFamily.subscription_type === "free" && subscriptionType !== "free") ||
      (oldFamily.subscription_type === "premium" && subscriptionType === "enterprise");
    const isDowngrade = subscriptionType === "free" && oldFamily.subscription_type !== "free";

    if (isUpgrade || (subscriptionType !== "free" && oldFamily.subscription_type === "free")) {
      analyticsService.trackEvent({
        eventName: "subscription_started",
        familyId,
        properties: { from: oldFamily.subscription_type, to: subscriptionType },
        source: "web",
      });
    }
    if (isDowngrade) {
      analyticsService.trackEvent({
        eventName: "subscription_cancelled",
        familyId,
        properties: { from: oldFamily.subscription_type, to: subscriptionType },
        source: "web",
      });
    }

    res.json({ success: true, subscriptionType });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
