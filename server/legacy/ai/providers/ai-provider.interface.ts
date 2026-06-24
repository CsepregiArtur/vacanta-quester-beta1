/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AI Provider Interface — toți provider-ii trebuie să implementeze asta
 */

export interface ReadingResult {
  passage: string;
  questions: Array<{
    id: number;
    question: string;
    options: string[];
    correctAnswerIndex: number;
  }>;
  difficultyClass?: string;
}

export interface VisionResult {
  isApproved: boolean;
  feedback: string;
  confidence: number; // 0 = nesigur, 1 = foarte sigur
}

export interface AIProvider {
  readonly name: string;

  /** Generează text de lectură + întrebări */
  generateReading(
    topic: string,
    childId: string,
    readingStreak: number,
    age: number,
    customPrompt?: string
  ): Promise<ReadingResult>;

  /** Analizează o imagine */
  analyzeImage(
    imageBase64: string,
    taskType: "dog_walk" | "chore",
    childName: string,
    age: number,
    taskDescription?: string
  ): Promise<VisionResult>;

  /** Provider-ul e configurat și gata de folosit? */
  isAvailable(): boolean;
}
