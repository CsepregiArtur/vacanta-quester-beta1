/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AI Service — API public
 * 
 * Folosește provider factory + job queue (BullMQ) pentru procesare asincronă.
 * Dacă Redis nu e disponibil, face apeluri directe sincrone.
 */

import { getActiveProvider } from "./providers";
import type { ReadingResult, VisionResult } from "./providers/ai-provider.interface";

// Încearcă încărcarea job queue (optional — Redis)
let useQueue = false;
let readingQueue: any = null;
let visionQueue: any = null;
let queueEvents: any = null;

try {
  const { readingQueue: rq, visionQueue: vq, queueEvents: qe } = require("./jobs/queue");
  readingQueue = rq;
  visionQueue = vq;
  queueEvents = qe;
  useQueue = true;
  console.log("[AI Service] BullMQ queue available");
} catch {
  console.log("[AI Service] No Redis/BullMQ — using direct calls");
}

export const aiService = {
  /** Generează lectură — cu job queue (dacă disponibil) sau direct */
  async generateReading(data: {
    topic: string;
    childId: string;
    readingStreak: number;
    age: number;
    customPrompt?: string;
    customQuestions?: string;
  }): Promise<ReadingResult> {
    if (useQueue && readingQueue) {
      const job = await readingQueue.add("generate-reading", data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      });
      return job.waitUntilFinished(queueEvents, 30_000);
    }
    // Direct fallback
    const provider = getActiveProvider();
    return provider.generateReading(data.topic, data.childId, data.readingStreak, data.age, data.customPrompt);
  },

  /** Analizează imagine — cu job queue (dacă disponibil) sau direct */
  async analyzeImage(data: {
    imageBase64: string;
    taskType: "dog_walk" | "chore";
    childName: string;
    age: number;
    taskDescription?: string;
  }): Promise<VisionResult> {
    if (useQueue && visionQueue) {
      const job = await visionQueue.add("analyze-image", data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      });
      return job.waitUntilFinished(queueEvents, 30_000);
    }
    // Direct fallback
    const provider = getActiveProvider();
    return provider.analyzeImage(data.imageBase64, data.taskType, data.childName, data.age, data.taskDescription);
  },

  /** Apel direct (forțat, fără coadă) */
  async generateReadingDirect(data: {
    topic: string;
    childId: string;
    readingStreak: number;
    age: number;
  }): Promise<ReadingResult> {
    const provider = getActiveProvider();
    return provider.generateReading(data.topic, data.childId, data.readingStreak, data.age);
  },

  /** Status AI Service */
  getStatus() {
    const provider = getActiveProvider();
    return {
      provider: provider.name,
      available: provider.isAvailable(),
      queueEnabled: useQueue,
    };
  },
};
