/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Provider Factory — selectează provider-ul activ
 * Ordinea: Gemini → OpenAI → Local (fallback garantat)
 */

import { AIProvider } from "./ai-provider.interface";
import { GeminiProvider } from "./gemini.provider";
import { OpenAIProvider } from "./openai.provider";
import { LocalProvider } from "./local.provider";

let cachedProvider: AIProvider | null = null;

export function getActiveProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const providers: AIProvider[] = [
    new GeminiProvider(),
    new OpenAIProvider(),
    new LocalProvider(),
  ];

  for (const p of providers) {
    if (p.isAvailable()) {
      console.log(`[AI Service] Using provider: ${p.name}`);
      cachedProvider = p;
      return p;
    }
  }

  // Fallback garantat
  cachedProvider = new LocalProvider();
  return cachedProvider;
}

export function resetProvider(): void {
  cachedProvider = null;
}

export type { AIProvider } from "./ai-provider.interface";
export type { ReadingResult, VisionResult } from "./ai-provider.interface";
