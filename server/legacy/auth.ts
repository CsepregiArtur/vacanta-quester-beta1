/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth.js — JWT Authentication Module
 * =====================================
 *
 * Access Token:  15 minute expiry
 * Refresh Token: 30 days expiry (stored server-side)
 *
 * Tokens are signed with a server-side secret (JWT_SECRET from .env).
 * Refresh tokens are stored in refresh_tokens.json for invalidation.
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Constants ───────────────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const BCRYPT_SALT_ROUNDS = 10;
const TOKENS_FILE = path.join(__dirname, "refresh_tokens.json");

// ─── Secret ──────────────────────────────────────────────────────────
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "your-super-secret-key-change-in-production") {
    console.warn(
      "⚠️  JWT_SECRET not set or still default. Using fallback (INSECURE - set JWT_SECRET in .env)"
    );
    return "vq-fallback-secret-do-not-use-in-production";
  }
  return secret;
}

// ─── Token Storage ───────────────────────────────────────────────────
interface RefreshTokenRecord {
  tokenHash: string;        // bcrypt hash of the refresh token (for lookup)
  email: string;            // owner email
  issuedAt: string;         // ISO timestamp
  expiresAt: string;        // ISO timestamp
  deviceInfo?: string;      // optional device identifier
}

interface TokenStore {
  tokens: RefreshTokenRecord[];
}

function loadTokenStore(): TokenStore {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const raw = fs.readFileSync(TOKENS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error loading refresh tokens:", err);
  }
  return { tokens: [] };
}

function saveTokenStore(store: TokenStore): void {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving refresh tokens:", err);
  }
}

// Clean up expired refresh tokens periodically
function cleanExpiredTokens(): void {
  const store = loadTokenStore();
  const now = new Date();
  const before = store.tokens.length;
  store.tokens = store.tokens.filter((t) => new Date(t.expiresAt) > now);
  if (store.tokens.length !== before) {
    console.log(`[AUTH] Cleaned up ${before - store.tokens.length} expired refresh tokens`);
    saveTokenStore(store);
  }
}
// Run cleanup on import, then every hour
cleanExpiredTokens();
setInterval(cleanExpiredTokens, 60 * 60 * 1000);

// ─── PIN Hashing ─────────────────────────────────────────────────────
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

// ─── Token Generation ────────────────────────────────────────────────
export function generateAccessToken(email: string, name: string): string {
  return jwt.sign(
    { email, name, type: "access" },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export async function generateRefreshToken(email: string, deviceInfo?: string): Promise<string> {
  const token = jwt.sign(
    { email, type: "refresh", jti: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}` },
    getJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Store token hash server-side for lookup & invalidation
  const tokenHash = await bcrypt.hash(token, 6); // lighter hash for speed
  const now = new Date();
  const store = loadTokenStore();
  store.tokens.push({
    tokenHash,
    email,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_MS).toISOString(),
    deviceInfo: deviceInfo || undefined,
  });

  // Limit to 10 refresh tokens per user (rotate oldest)
  const userTokens = store.tokens.filter((t) => t.email === email);
  if (userTokens.length > 10) {
    const toRemove = userTokens.length - 10;
    let removed = 0;
    store.tokens = store.tokens.filter((t) => {
      if (t.email === email && removed < toRemove) {
        removed++;
        return false;
      }
      return true;
    });
  }

  saveTokenStore(store);
  return token;
}

// ─── Token Verification ──────────────────────────────────────────────
export function verifyAccessToken(token: string): { email: string; name: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (decoded.type !== "access") return null;
    return { email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

async function findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
  const store = loadTokenStore();
  for (const record of store.tokens) {
    const match = await bcrypt.compare(token, record.tokenHash);
    if (match) return record;
  }
  return null;
}

export async function verifyRefreshToken(token: string): Promise<{ email: string } | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (decoded.type !== "refresh") return null;

    // Verify it exists in server-side store
    const record = await findRefreshToken(token);
    if (!record) return null;

    // Check expiry
    if (new Date(record.expiresAt) <= new Date()) return null;

    return { email: decoded.email };
  } catch {
    return null;
  }
}

// ─── Token Refresh ───────────────────────────────────────────────────
export async function refreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; email: string } | null> {
  const decoded = await verifyRefreshToken(refreshToken);
  if (!decoded) return null;

  // Revoke old refresh token (rotation)
  await revokeRefreshToken(refreshToken);

  // Look up user for name
  const users = loadUsers();
  const user = users.find((u: any) => u.email.toLowerCase() === decoded.email.toLowerCase());
  const name = user?.name || decoded.email.split("@")[0];

  // Issue new pair
  const newAccessToken = generateAccessToken(decoded.email, name);
  const newRefreshToken = await generateRefreshToken(decoded.email);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, email: decoded.email };
}

// ─── Token Revocation (Logout) ──────────────────────────────────────
export async function revokeRefreshToken(token: string): Promise<void> {
  const store = loadTokenStore();
  const before = store.tokens.length;

  // Find by comparing hashes
  for (let i = store.tokens.length - 1; i >= 0; i--) {
    const match = await bcrypt.compare(token, store.tokens[i].tokenHash);
    if (match) {
      store.tokens.splice(i, 1);
      break;
    }
  }

  if (store.tokens.length !== before) {
    saveTokenStore(store);
  }
}

export async function revokeAllUserTokens(email: string): Promise<void> {
  const store = loadTokenStore();
  const before = store.tokens.length;
  store.tokens = store.tokens.filter((t) => t.email !== email);
  if (store.tokens.length !== before) {
    saveTokenStore(store);
  }
}

// ─── Express Middleware ──────────────────────────────────────────────
export function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de acces lipsă. Conectează-te din nou!" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ error: "Token expirat sau invalid. Folosește refresh token!" });
  }

  // Attach user info to request
  req.user = decoded;
  req.userEmail = decoded.email;
  next();
}

// ─── Load users helper (duplicated from server.ts to avoid circular deps) ──
interface UserEntry {
  email: string;
  name: string;
  pin: string;
  pinHash?: string; // bcrypt hash stored after migration
}

function loadUsers(): UserEntry[] {
  const usersPath = path.join(process.cwd(), "src", "data", "users.json");
  try {
    const dir = path.dirname(usersPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(usersPath)) {
      return JSON.parse(fs.readFileSync(usersPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading users:", err);
  }
  return [];
}
