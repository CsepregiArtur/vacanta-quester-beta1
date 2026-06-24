/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics Module — frontend event tracking
 *
 * Evenimente suportate:
 *   activity_created       – sarcină nouă adăugată
 *   activity_completed     – sarcină finalizată
 *   reward_claimed         – recompensă deblocată
 *   streak_lost            – streak de lectură pierdut
 *   subscription_started   – abonament activat
 *   subscription_cancelled – abonament anulat
 */

import { authFetch } from "../auth";

export type AnalyticsEventName =
  | "activity_created"
  | "activity_completed"
  | "reward_claimed"
  | "streak_lost"
  | "subscription_started"
  | "subscription_cancelled";

/**
 * Trimite un eveniment de analytics la server.
 * Funcția ignoră tăcerea erorile — analytics nu trebuie să blocheze UI-ul.
 */
export async function trackEvent(
  eventName: AnalyticsEventName,
  childId?: string,
  properties?: Record<string, any>
): Promise<void> {
  try {
    await authFetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, childId, properties }),
    });
  } catch {
    // Analytics nu trebuie să afecteze experiența utilizatorului
  }
}
