/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GitHub Issues Service — raportare automată a erorilor
 * ======================================================
 * Creează GitHub Issues automate când apar erori în aplicație.
 * 
 * Labels suportate:
 *   critical    – erori fatale (app crash, DB down)
 *   sync        – erori de sincronizare offline
 *   ai          – erori AI (Gemini/OpenAI, reading generation, vision)
 *   ha-rewards  – erori Home Assistant / recompense / puncte
 *   bug         – fallback pentru orice altă eroare
 */

const GITHUB_API = "https://api.github.com";

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  labels: { name: string }[];
  html_url: string;
  created_at: string;
}

interface CreateIssueResult {
  success: boolean;
  issue?: GitHubIssue;
  duplicate?: GitHubIssue;
  error?: string;
  skipped?: boolean;
}

// ─── Config ─────────────────────────────────────────────────────────
function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "user/repo"

  if (!token || !repo) {
    return null;
  }

  return { token, repo };
}

// ─── Headers pentru GitHub API ──────────────────────────────────────
function apiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "vacanta-quester-bug-reporter/1.0",
  };
}

// ─── Determină labels pe baza contextului erorii ────────────────────
function determineLabels(errorMessage: string, context?: string[]): string[] {
  const labels = new Set<string>();
  const msg = errorMessage.toLowerCase();
  const ctx = (context || []).map((c) => c.toLowerCase());

  // Combinăm mesajul + contextul pentru analiză
  const haystack = [...ctx, msg].join(" ");

  // ── critical: erori fatale ──
  if (
    /crash|fatal|out of memory|econnrefused|pool error|database.*down|unhandled/i.test(haystack)
  ) {
    labels.add("critical");
  }

  // ── sync: erori de sincronizare ──
  if (
    /sync|queue|offline|conflict.*version|retry_count|enqueue/i.test(haystack)
  ) {
    labels.add("sync");
  }

  // ── ai: erori AI ──
  if (
    /gemini|openai|ai.*provider|reading.*generat|vision|ai.*service|provider.*unavailable/i.test(haystack)
  ) {
    labels.add("ai");
  }

  // ── ha-rewards: Home Assistant / recompense ──
  if (
    /home.?assistant|reward|points.*transact|buy.*reward|award.*points/i.test(haystack)
  ) {
    labels.add("ha-rewards");
  }

  // ── Dacă nu s-a potrivit nimic → bug ──
  if (labels.size === 0) {
    labels.add("bug");
  }

  return Array.from(labels);
}

// ── Normalizează titlul: elimină email-uri, token-uri, date variabile ──
function sanitizeTitle(title: string): string {
  return title
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/g, "$1[redacted]")
    .replace(/(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, "[jwt]")
    .substring(0, 200);
}

// ── Formatează body-ul issue-ului cu stack trace ──
function formatIssueBody(params: {
  errorMessage: string;
  stackTrace?: string;
  context?: string[];
  route?: string;
  method?: string;
  familyId?: string;
  userId?: string;
  timestamp?: string;
}): string {
  const ts = params.timestamp || new Date().toISOString();
  const lines: string[] = [
    `## 🐛 Eroare raportată automat`,
    ``,
    `**Timestamp:** ${ts}`,
    `**Mediu:** ${process.env.NODE_ENV || "development"}`,
    `**Versiune:** ${process.env.npm_package_version || "unknown"}`,
    ``,
  ];

  if (params.route) {
    lines.push(`**Endpoint:** \`${params.method || "GET"} ${params.route}\``);
  }
  if (params.familyId) {
    lines.push(`**Family ID:** \`${params.familyId}\``);
  }
  if (params.userId) {
    lines.push(`**User:** \`${params.userId}\``);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `### 📋 Mesaj eroare`,
    "```",
    params.errorMessage,
    "```",
    ``
  );

  if (params.stackTrace) {
    lines.push(
      `### 🔍 Stack Trace`,
      "```",
      params.stackTrace.substring(0, 5000), // limită de siguranță
      "```",
      ``
    );
  }

  if (params.context && params.context.length > 0) {
    lines.push(
      `### 📎 Context adițional`,
      ...params.context.map((c) => `- ${c}`),
      ``
    );
  }

  lines.push(
    `---`,
    `> Acest issue a fost generat automat de sistemul de raportare a erorilor.`,
    `> Dacă problema este deja cunoscută, acest issue va fi închis automat.`,
  );

  return lines.join("\n");
}

// ── Verifică dacă există un issue similar deschis ──
async function findDuplicateIssue(
  repo: string,
  token: string,
  title: string,
  labels: string[]
): Promise<GitHubIssue | null> {
  // Căutare după titlu (primele 50 caractere)
  const searchTitle = title.substring(0, 50);
  const query = encodeURIComponent(
    `repo:${repo} is:issue is:open ${searchTitle}`
  );

  const response = await fetch(`${GITHUB_API}/search/issues?q=${query}&per_page=5`, {
    headers: apiHeaders(token),
  });

  if (!response.ok) {
    console.warn(`[GitHub Issues] Search failed: ${response.status} ${response.statusText}`);
    return null;
  }

  const data: { items: GitHubIssue[] } = await response.json();
  if (!data.items || data.items.length === 0) return null;

  // Verifică similaritatea titlurilor
  const normalized = title.toLowerCase().trim();
  for (const issue of data.items) {
    const issueTitle = issue.title.toLowerCase().trim();
    // Match exact sau substring semnificativ
    if (
      issueTitle === normalized ||
      issueTitle.includes(normalized) ||
      normalized.includes(issueTitle)
    ) {
      return issue;
    }
  }

  return null;
}

// ── Verifică dacă label-ele există în repo, le creează dacă nu ──
const KNOWN_LABELS = [
  { name: "critical", color: "b60205", description: "Eroare fatală — necesită atenție imediată" },
  { name: "sync", color: "1d76db", description: "Eroare de sincronizare offline" },
  { name: "ai", color: "0e8a16", description: "Eroare AI Provider (Gemini/OpenAI)" },
  { name: "ha-rewards", color: "bfdadc", description: "Eroare Home Assistant / Recompense" },
  { name: "bug", color: "d73a4a", description: "Bug raportat automat" },
];

let labelsEnsured = false;

async function ensureLabels(repo: string, token: string): Promise<void> {
  if (labelsEnsured) return;

  try {
    // Obține label-ele existente
    const response = await fetch(`${GITHUB_API}/repos/${repo}/labels`, {
      headers: apiHeaders(token),
    });

    if (!response.ok) {
      console.warn(`[GitHub Issues] Cannot fetch labels: ${response.status}`);
      return;
    }

    const existingLabels: { name: string }[] = await response.json();
    const existingNames = new Set(existingLabels.map((l) => l.name));

    // Creează label-ele lipsă
    for (const label of KNOWN_LABELS) {
      if (!existingNames.has(label.name)) {
        try {
          await fetch(`${GITHUB_API}/repos/${repo}/labels`, {
            method: "POST",
            headers: apiHeaders(token),
            body: JSON.stringify(label),
          });
          console.log(`[GitHub Issues] Created label: ${label.name}`);
        } catch (err: any) {
          console.warn(`[GitHub Issues] Cannot create label ${label.name}: ${err.message}`);
        }
      }
    }

    labelsEnsured = true;
  } catch (err: any) {
    console.warn(`[GitHub Issues] ensureLabels error: ${err.message}`);
  }
}

// ═════════════════════════════════════════════════════════════════════
// API PUBLICĂ
// ═════════════════════════════════════════════════════════════════════

/**
 * Creează un GitHub Issue pentru o eroare.
 *
 * @param params - Detalii despre eroare
 * @returns Rezultatul operației
 *
 * Exemplu:
 * ```ts
 * const result = await createErrorIssue({
 *   errorMessage: "Gemini API returned 500",
 *   stackTrace: error.stack,
 *   context: ["AI_PROVIDER=gemini", "Model: gemini-2.0-flash"],
 *   route: "/api/task/generate-reading",
 *   familyId: "abc-123",
 * });
 * ```
 */
export async function createErrorIssue(params: {
  errorMessage: string;
  stackTrace?: string;
  context?: string[];
  route?: string;
  method?: string;
  familyId?: string;
  userId?: string;
  force?: boolean; // ignoră verificarea de duplicat
}): Promise<CreateIssueResult> {
  const config = getConfig();
  if (!config) {
    console.warn("[GitHub Issues] GITHUB_TOKEN sau GITHUB_REPO neconfigurat. Se omite raportarea.");
    return { success: false, skipped: true, error: "GitHub not configured" };
  }

  const { token, repo } = config;
  const title = sanitizeTitle(params.errorMessage);
  const labels = determineLabels(params.errorMessage, params.context);

  // Asigură label-ele (doar prima dată)
  await ensureLabels(repo, token);

  // Verifică duplicat (dacă nu e forțat)
  if (!params.force) {
    try {
      const duplicate = await findDuplicateIssue(repo, token, title, labels);
      if (duplicate) {
        console.log(
          `[GitHub Issues] Duplicat găsit: #${duplicate.number} — ${duplicate.title}`
        );
        return {
          success: true,
          duplicate,
          issue: duplicate,
          skipped: true,
        };
      }
    } catch (err: any) {
      console.warn(`[GitHub Issues] Duplicate check failed: ${err.message}`);
      // Continuă să creeze oricum
    }
  }

  // Construiește body-ul
  const body = formatIssueBody({
    errorMessage: params.errorMessage,
    stackTrace: params.stackTrace,
    context: params.context,
    route: params.route,
    method: params.method,
    familyId: params.familyId,
    userId: params.userId,
  });

  // Creează issue
  try {
    const response = await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
      method: "POST",
      headers: apiHeaders(token),
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[GitHub Issues] Create failed: ${response.status} ${errBody}`);
      return {
        success: false,
        error: `GitHub API error: ${response.status} ${response.statusText}`,
      };
    }

    const issue: GitHubIssue = await response.json();
    console.log(`[GitHub Issues] Creat issue #${issue.number}: ${issue.html_url}`);

    return { success: true, issue };
  } catch (err: any) {
    console.error(`[GitHub Issues] Network error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Raportează o eroare cu context minim.
 * Versiune simplificată — pentru integrare rapidă în try/catch.
 *
 * ```ts
 * import { reportError } from "../services/github-issues.service";
 *
 * try {
 *   // ...
 * } catch (err: any) {
 *   await reportError(err, { route: "/api/sync/action" });
 * }
 * ```
 */
export async function reportError(
  error: Error,
  meta?: {
    route?: string;
    method?: string;
    familyId?: string;
    userId?: string;
    context?: string[];
  }
): Promise<CreateIssueResult> {
  return createErrorIssue({
    errorMessage: error.message || String(error),
    stackTrace: error.stack,
    context: meta?.context,
    route: meta?.route,
    method: meta?.method,
    familyId: meta?.familyId,
    userId: meta?.userId,
  });
}

// ═════════════════════════════════════════════════════════════════════
// TEST — Verifică conexiunea GitHub
// ═════════════════════════════════════════════════════════════════════
export async function testGitHubConnection(): Promise<{
  ok: boolean;
  repo?: string;
  labels?: string[];
  error?: string;
}> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "GITHUB_TOKEN sau GITHUB_REPO neconfigurat" };
  }

  try {
    const response = await fetch(`${GITHUB_API}/repos/${config.repo}`, {
      headers: apiHeaders(config.token),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data: any = await response.json();
    return {
      ok: true,
      repo: data.full_name,
      labels: KNOWN_LABELS.map((l) => l.name),
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
