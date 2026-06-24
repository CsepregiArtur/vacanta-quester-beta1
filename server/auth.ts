/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth Module — re-export from legacy for new service routes
 */

export {
  hashPin,
  verifyPin,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  refreshTokens,
  revokeRefreshToken,
  revokeAllUserTokens,
  authMiddleware,
} from "./legacy/auth";

// Re-export cu alias
export { authMiddleware as authenticateToken } from "./legacy/auth";
