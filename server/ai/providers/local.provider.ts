/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local Provider — fallback fără API extern
 * Generare conținut lectură local + aprobare automată imagini
 */

import { AIProvider, ReadingResult, VisionResult } from "./ai-provider.interface";

export class LocalProvider implements AIProvider {
  readonly name = "local";

  isAvailable(): boolean {
    return true; // mereu disponibil
  }

  async generateReading(
    topic: string,
    childId: string,
    readingStreak: number,
    age: number
  ): Promise<ReadingResult> {
    // TODO: Mută aici conținutul funcției generateLocalReading() din server.ts
    // Păstrează toată logica existentă (topic detection, age adaptation, streak progression)
    throw new Error("Not migrated yet — see server.ts generateLocalReading()");
  }

  async analyzeImage(
    _imageBase64: string,
    taskType: "dog_walk" | "chore",
    childName: string,
    _age: number
  ): Promise<VisionResult> {
    // Fallback: aprobă automat — părintele confirmă vizual
    return {
      isApproved: true,
      feedback:
        taskType === "dog_walk"
          ? `🐾 Plimbarea lui ${childName} a fost înregistrată! Părintele va verifica vizual.`
          : `✅ Sarcina lui ${childName} a fost înregistrată! Părintele va verifica vizual.`,
      confidence: 0.5,
    };
  }
}
