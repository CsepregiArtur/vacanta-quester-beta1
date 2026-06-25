/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BullMQ Job Queue — Redis-based async job processing
 * 
 * Flow: API call → Queue → Worker → Provider → Result
 * 
 * Dacă Redis nu e disponibil, acest fișier aruncă o eroare
 * și server/ai/index.ts face fallback la apeluri directe.
 */

import { Queue, Worker, QueueEvents } from "bullmq";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
};

// ─── Queue-uri ───────────────────────────────────────────────────────
export const readingQueue = new Queue("ai-reading", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,  // păstrează ultimele 100 completate
    removeOnFail: 50,       // păstrează ultimele 50 eșuate
  },
});

export const visionQueue = new Queue("ai-vision", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const queueEvents = new QueueEvents("ai-reading", { connection });

// ─── Workers ─────────────────────────────────────────────────────────
import { getActiveProvider } from "../providers";

new Worker(
  "ai-reading",
  async (job) => {
    const { topic, childId, readingStreak, age, customPrompt } = job.data;
    const provider = getActiveProvider();
    return provider.generateReading(topic, childId, readingStreak, age, customPrompt);
  },
  { connection, concurrency: 2 } // maxim 2 job-uri simultan
);

new Worker(
  "ai-vision",
  async (job) => {
    const { imageBase64, taskType, childName, age, taskDescription } = job.data;
    const provider = getActiveProvider();
    return provider.analyzeImage(imageBase64, taskType, childName, age, taskDescription);
  },
  { connection, concurrency: 2 }
);

console.log(`[AI Queue] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
