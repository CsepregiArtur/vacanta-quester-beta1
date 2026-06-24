/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gemini Provider — Google Gemini API
 * Folosește @google/genai SDK pentru generare conținut și analiză imagini
 */

import { GoogleGenAI, Type } from "@google/genai";
import { AIProvider, ReadingResult, VisionResult } from "./ai-provider.interface";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | null = null;

  isAvailable(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return !!key && key !== "MY_GEMINI_API_KEY" && !key.includes("YOUR_") && !key.includes("INSERT_");
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || "",
      });
    }
    return this.client;
  }

  async generateReading(
    topic: string,
    childId: string,
    readingStreak: number,
    age: number,
    customPrompt?: string
  ): Promise<ReadingResult> {
    // TODO: Mută aici logica Gemini din POST /api/task/generate-reading din server.ts
    // Include:
    //   - systemInstruction pedagogic
    //   - responseSchema pentru JSON structurat
    //   - progresie pe bază de streak
    //   - dificultate pe bază de vârstă
    //   - suport pentru customPrompt de la părinte
    throw new Error("Not migrated yet — see server.ts POST /api/task/generate-reading");
  }

  async analyzeImage(
    imageBase64: string,
    taskType: "dog_walk" | "chore",
    childName: string,
    age: number,
    taskDescription?: string
  ): Promise<VisionResult> {
    // TODO: Mută aici logica Gemini Vision din:
    //   - POST /api/task/claim-walk (dog walk)
    //   - POST /api/task/submit-chore (chore)
    throw new Error("Not migrated yet — see server.ts POST /api/task/claim-walk and submit-chore");
  }
}
