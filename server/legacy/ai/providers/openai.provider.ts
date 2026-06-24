/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenAI Provider — ChatGPT / GPT-4o
 * Compatibil cu API-ul OpenAI (chat completions + vision)
 */

import { AIProvider, ReadingResult, VisionResult } from "./ai-provider.interface";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  isAvailable(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return !!key && key !== "sk-your-key" && !key.includes("YOUR_");
  }

  async generateReading(
    topic: string,
    childId: string,
    readingStreak: number,
    age: number
  ): Promise<ReadingResult> {
    // TODO: Implementează apel OpenAI chat completions
    // model: "gpt-4o"
    // systemInstruction + user prompt
    // response_format: { type: "json_object" }
    throw new Error("Not implemented yet");
  }

  async analyzeImage(
    imageBase64: string,
    taskType: "dog_walk" | "chore",
    childName: string,
    age: number,
    taskDescription?: string
  ): Promise<VisionResult> {
    // TODO: Implementează apel OpenAI vision
    // mesaj cu conținut mixt: text + image_url
    throw new Error("Not implemented yet");
  }
}
