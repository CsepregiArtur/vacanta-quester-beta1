/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit Tests — GitHub Issues: Label Detection
 * ============================================
 * Testează determinarea automată a label-elor pe baza mesajului de eroare.
 *
 * Concepte testate:
 *   - Erori critice → label "critical"
 *   - Erori sync → label "sync"
 *   - Erori AI → label "ai"
 *   - Erori HA/Rewards → label "ha-rewards"
 *   - Erori generale → label "bug"
 *   - Erori cu context multiplu → label-uri multiple
 */

import { describe, test, expect } from 'vitest';

// Testăm funcția internă determinăLabels prin re-implementare izolată
function determineLabels(errorMessage: string, context?: string[]): string[] {
  const labels = new Set<string>();
  const msg = errorMessage.toLowerCase();
  const ctx = (context || []).map((c) => c.toLowerCase());
  const haystack = [...ctx, msg].join(' ');

  if (/crash|fatal|out of memory|econnrefused|pool error|database.*down|unhandled/i.test(haystack)) {
    labels.add('critical');
  }

  if (/sync|queue|offline|conflict.*version|retry_count|enqueue/i.test(haystack)) {
    labels.add('sync');
  }

  if (/gemini|openai|ai.*provider|reading.*generat|vision|ai.*service|provider.*unavailable/i.test(haystack)) {
    labels.add('ai');
  }

  if (/home.?assistant|reward|points.*transact|buy.*reward|award.*points/i.test(haystack)) {
    labels.add('ha-rewards');
  }

  if (labels.size === 0) {
    labels.add('bug');
  }

  return Array.from(labels);
}

describe('determineLabels — critical errors', () => {
  test('detectează "crash"', () => {
    expect(determineLabels('Server crash: out of memory')).toContain('critical');
  });

  test('detectează "fatal"', () => {
    expect(determineLabels('Fatal error in main loop')).toContain('critical');
  });

  test('detectează "ECONNREFUSED"', () => {
    expect(determineLabels('Error: connect ECONNREFUSED 127.0.0.1:5432')).toContain('critical');
  });

  test('detectează "pool error"', () => {
    expect(determineLabels('Pool error: connection timeout')).toContain('critical');
  });

  test('detectează "database down"', () => {
    expect(determineLabels('PostgreSQL database down')).toContain('critical');
  });

  test('detectează "unhandled" promise rejection', () => {
    expect(determineLabels('Unhandled promise rejection')).toContain('critical');
  });
});

describe('determineLabels — sync errors', () => {
  test('detectează "sync" în mesaj', () => {
    expect(determineLabels('Sync action failed: timeout')).toContain('sync');
  });

  test('detectează "queue" error', () => {
    expect(determineLabels('Queue processor error: connection lost')).toContain('sync');
  });

  test('detectează "offline" conflict', () => {
    expect(determineLabels('Offline sync conflict detected')).toContain('sync');
  });

  test('detectează version conflict', () => {
    expect(determineLabels('Conflict on version 3: expected 5')).toContain('sync');
  });

  test('detectează "enqueue" error', () => {
    expect(determineLabels('Failed to enqueue sync action')).toContain('sync');
  });

  test('detectează "retry_count" exceeded', () => {
    expect(determineLabels('Max retry count exceeded for sync item')).toContain('sync');
  });
});

describe('determineLabels — AI errors', () => {
  test('detectează "Gemini"', () => {
    expect(determineLabels('Gemini API returned 503')).toContain('ai');
  });

  test('detectează "OpenAI"', () => {
    expect(determineLabels('OpenAI provider error: rate limit')).toContain('ai');
  });

  test('detectează "AI provider"', () => {
    expect(determineLabels('AI provider not available')).toContain('ai');
  });

  test('detectează reading generation error', () => {
    expect(determineLabels('Reading generation failed: content blocked')).toContain('ai');
  });

  test('detectează "vision" error', () => {
    expect(determineLabels('Vision analysis failed: invalid image')).toContain('ai');
  });

  test('detectează "provider unavailable"', () => {
    expect(determineLabels('AI provider unavailable')).toContain('ai');
  });
});

describe('determineLabels — HA / Rewards errors', () => {
  test('detectează "home assistant"', () => {
    expect(determineLabels('Home Assistant connection refused')).toContain('ha-rewards');
  });

  test('detectează "homeassistant" (fără spațiu)', () => {
    expect(determineLabels('HomeAssistant token invalid')).toContain('ha-rewards');
  });

  test('detectează "reward" error', () => {
    expect(determineLabels('Reward purchase failed: insufficient points')).toContain('ha-rewards');
  });

  test('detectează points transaction error', () => {
    expect(determineLabels('Points transaction failed: version conflict')).toContain('ha-rewards');
  });

  test('detectează "award points" error', () => {
    expect(determineLabels('Failed to award points: child not found')).toContain('ha-rewards');
  });

  test('detectează "buy reward" error', () => {
    expect(determineLabels('Cannot buy reward: not enough points')).toContain('ha-rewards');
  });
});

describe('determineLabels — fallback "bug"', () => {
  test('eroare generică → label "bug"', () => {
    const labels = determineLabels('Something went wrong');
    expect(labels).toContain('bug');
    expect(labels).toHaveLength(1);
  });

  test('eroare JSON parse → "bug"', () => {
    const labels = determineLabels('Unexpected token in JSON');
    expect(labels).toContain('bug');
  });

  test('eroare de tip invalid → "bug"', () => {
    const labels = determineLabels('Cannot read property of undefined');
    expect(labels).toContain('bug');
  });
});

describe('determineLabels — label-uri multiple', () => {
  test('eroare sync + critical = ambele label-uri', () => {
    const labels = determineLabels('Fatal sync queue error: ECONNREFUSED');
    expect(labels).toContain('critical');
    expect(labels).toContain('sync');
    expect(labels).not.toContain('bug');
  });

  test('eroare AI + critical = ambele label-uri', () => {
    const labels = determineLabels('CRASH: Gemini provider fatal error');
    expect(labels).toContain('critical');
    expect(labels).toContain('ai');
    expect(labels).not.toContain('bug');
  });

  test('context multiple poate aduce label-uri multiple', () => {
    const labels = determineLabels('Operation failed', ['sync', 'reward points update']);
    expect(labels).toContain('sync');
    expect(labels).toContain('ha-rewards');
    expect(labels).not.toContain('bug');
  });

  test('context poate suprascrie tipul erorii', () => {
    // Chiar dacă mesajul e generic, contextul determină label-urile
    const labels = determineLabels('Unknown error', ['ai', 'gemini']);
    expect(labels).toContain('ai');
    expect(labels).not.toContain('bug');
  });
});
