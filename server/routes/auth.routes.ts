/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth Routes — înregistrare, login, refresh, logout
 */

import { Router } from "express";
import { familyService, analyticsService } from "../services";
import { hashPin, verifyPin, generateAccessToken, generateRefreshToken, refreshTokens, revokeRefreshToken } from "../auth";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, name, pin } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Email-ul și numele sunt obligatorii!" });
    }

    const existing = await familyService.findParentByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Acest email este deja înregistrat!" });
    }

    const userPin = pin || "0000";
    const { family, parent } = await familyService.createFamily(name, email, name, userPin);

    const accessToken = generateAccessToken(email.toLowerCase(), name);
    const refreshToken = await generateRefreshToken(email.toLowerCase());

    res.json({
      success: true,
      user: { email: email.toLowerCase(), name, familyId: family.id },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email-ul este obligatoriu!" });
    }

    const parent = await familyService.findParentByEmail(email);
    if (!parent) {
      return res.status(404).json({ error: "Acest utilizator nu există!" });
    }

    const pinValid = await verifyPin(password || "0000", parent.pin_hash);
    if (!pinValid) {
      return res.status(400).json({ error: "Cod PIN incorect!" });
    }

    const accessToken = generateAccessToken(parent.email, parent.name);
    const refreshToken = await generateRefreshToken(parent.email);
    const children = await familyService.getChildren(parent.family_id);
    const family = await familyService.getFamilyById(parent.family_id);

    res.json({
      success: true,
      user: { email: parent.email, name: parent.name, familyId: parent.family_id },
      accessToken,
      refreshToken,
      expiresIn: 900,
      family,
      children,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token lipsă!" });
    }
    const result = await refreshTokens(refreshToken);
    if (!result) {
      return res.status(401).json({ error: "Refresh token invalid!" });
    }
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
