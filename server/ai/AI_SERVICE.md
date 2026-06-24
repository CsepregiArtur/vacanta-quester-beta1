# 🤖 AI Service — Arhitectură Modulară

> **Obiectiv:** Separă toată logica AI din `server.ts` într-un modul dedicat,
> cu job queue (Redis + BullMQ) și suport pentru multiple provider-e (Gemini, OpenAI, local).

---

## Pasul 15 — Separare AI în modul dedicat

### Structura finală

```
server/ai/
├── AI_SERVICE.md                    # ← Acest document
├── index.ts                         # Exporturi publice
├── types.ts                         # Toate tipurile AI
│
├── providers/                       # Provider-i AI
│   ├── ai-provider.interface.ts     # Interfață comună
│   ├── gemini.provider.ts           # Google Gemini
│   ├── openai.provider.ts           # OpenAI / ChatGPT
│   └── local.provider.ts            # Fallback local (fără API)
│
├── prompts/                         # Template-uri de prompt-uri
│   ├── reading.prompt.ts            # Generare lectură
│   ├── dog-walk.prompt.ts           # Verificare plimbare câine
│   └── chore.prompt.ts             # Verificare sarcină casnică
│
└── jobs/                            # Job queue
    ├── queue.ts                     # BullMQ configurare
    ├── reading.job.ts               # Job: generare lectură
    ├── vision.job.ts                # Job: analiză imagine (walk/chore)
    └── worker.ts                    # Worker care procesează coada
```

### Fluxul actual (ACUM) vs Fluxul nou (DUPĂ)

#### ACUM — Totul în `server.ts`

```
server.ts
├── getGenAI()                           ← funcție îngropată
├── generateLocalReading()               ← funcție uriașă (450+ linii)
├── POST /api/task/generate-reading      ← Gemini + fallback direct
├── POST /api/task/claim-walk            ← Gemini Vision direct
├── POST /api/task/submit-chore          ← Gemini Vision direct
└── GEMINI_API_KEY check                 ← verificare împrăștiată
```

#### DUPĂ — Modul `server/ai/`

```
server.ts (curat)
└── apelează aiService.processReading() / aiService.processVision()

server/ai/
├── index.ts                     ← API public
│   ├── processReading()
│   ├── processVision()
│   └── getProvider()
│
├── providers/
│   ├── gemini.provider.ts       ← Gemini API calls
│   ├── openai.provider.ts       ← OpenAI API calls
│   └── local.provider.ts        ← Fallback local
│
├── prompts/
│   ├── reading.prompt.ts        ← Template-uri prompt
│   ├── dog-walk.prompt.ts
│   └── chore.prompt.ts
│
└── jobs/
    ├── queue.ts                 ← BullMQ queue
    ├── reading.job.ts           ← Reading generation job
    ├── vision.job.ts            ← Vision analysis job
    └── worker.ts                ← Queue consumer
```

---

## Pasul 16 — Job Queue (Redis + BullMQ)

### Fluxul cu Job Queue

```
                    ┌─────────────┐
                    │   Client    │
                    │  (API call) │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Express   │
                    │  endpoint   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   BullMQ    │
                    │   Queue     │  ← Redis
                    │             │
                    │  readingQ  │
                    │  visionQ   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Worker    │
                    │  (background)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Gemini  │ │  OpenAI  │ │  Local   │
        │ Provider │ │ Provider │ │ Provider │
        └──────────┘ └──────────┘ └──────────┘
              │
              ▼
        ┌─────────────┐
        │   Result    │
        │  (callback/ │
        │   webhook)  │
        └─────────────┘
```

### Instalare

```bash
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

Redis trebuie să ruleze local:

```bash
# macOS
brew install redis
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Configurare coadă

```typescript
// server/ai/jobs/queue.ts
import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

// Queue-uri
export const readingQueue = new Queue("ai-reading", { connection });
export const visionQueue = new Queue("ai-vision", { connection });
export const queueEvents = new QueueEvents("ai-reading", { connection });

// Workers
export const readingWorker = new Worker(
  "ai-reading",
  async (job) => {
    const { topic, childId, readingStreak, age } = job.data;
    const provider = getActiveProvider();
    return provider.generateReading(topic, childId, readingStreak, age);
  },
  { connection }
);

export const visionWorker = new Worker(
  "ai-vision",
  async (job) => {
    const { imageBase64, taskType, childName, age } = job.data;
    const provider = getActiveProvider();
    return provider.analyzeImage(imageBase64, taskType, childName, age);
  },
  { connection }
);
```

### Adăugare job din endpoint

```typescript
// În server.ts — exemplu endpoint curat
app.post("/api/task/generate-reading", async (req, res) => {
  const { childId, topic } = req.body;
  
  // Adaugă job în coadă și returnează imediat
  const job = await readingQueue.add("generate-reading", {
    topic,
    childId,
    readingStreak: child.readingStreak,
    age: child.age,
  });

  // Așteaptă rezultatul (sau poll / webhook)
  const result = await job.waitUntilFinished(queueEvents, 30_000);
  
  res.json(result);
});
```

---

## Interfața Provider-ilor

```typescript
// server/ai/providers/ai-provider.interface.ts

export interface AIProvider {
  /** Numele provider-ului */
  readonly name: string;

  /** Generează text de lectură + întrebări */
  generateReading(
    topic: string,
    childId: string,
    readingStreak: number,
    age: number,
    customPrompt?: string
  ): Promise<ReadingResult>;

  /** Analizează o imagine pentru verificare sarcină */
  analyzeImage(
    imageBase64: string,
    taskType: "dog_walk" | "chore",
    childName: string,
    age: number,
    taskDescription?: string
  ): Promise<VisionResult>;

  /** Verifică dacă provider-ul e disponibil */
  isAvailable(): boolean;
}

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
  confidence: number; // 0-1
}
```

---

## Provider-i Implementați

### 1. Gemini Provider

```typescript
// server/ai/providers/gemini.provider.ts
export class GeminiProvider implements AIProvider {
  name = "gemini";
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });
  }

  isAvailable(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return !!key && key !== "MY_GEMINI_API_KEY" && !key.includes("YOUR_");
  }

  async generateReading(topic, childId, readingStreak, age, customPrompt?): Promise<ReadingResult> {
    const systemInstruction = `Ești un pedagog de elită din România...`;
    const response = await this.client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generează un text despre "${topic}"...`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: { /* ... */ },
      },
    });
    return JSON.parse(response.text);
  }

  async analyzeImage(imageBase64, taskType, childName, age, taskDescription?): Promise<VisionResult> {
    const systemInstruction = `Ești un evaluator robotizat...`;
    const response = await this.client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
        { text: `Analizează această fotografie...` },
      ],
      config: { systemInstruction, responseMimeType: "application/json", responseSchema },
    });
    return JSON.parse(response.text);
  }
}
```

### 2. OpenAI Provider

```typescript
// server/ai/providers/openai.provider.ts
export class OpenAIProvider implements AIProvider {
  name = "openai";

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generateReading(topic, childId, readingStreak, age): Promise<ReadingResult> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Ești un pedagog de elită...` },
          { role: "user", content: `Generează un text despre "${topic}"...` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  async analyzeImage(imageBase64, taskType, childName, age): Promise<VisionResult> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Ești un evaluator robotizat...` },
          {
            role: "user",
            content: [
              { type: "text", text: `Analizează această fotografie...` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }
}
```

### 3. Local Provider (Fallback)

```typescript
// server/ai/providers/local.provider.ts
export class LocalProvider implements AIProvider {
  name = "local";

  isAvailable(): boolean {
    return true; // mereu disponibil
  }

  async generateReading(topic, childId, readingStreak, age): Promise<ReadingResult> {
    // Conținutul funcției generateLocalReading() existente
    // mutată aici din server.ts
    return generateLocalReadingContent(topic, childId, readingStreak, age);
  }

  async analyzeImage(imageBase64, taskType, childName, age): Promise<VisionResult> {
    // Fallback: aprobă automat cu un mesaj generic
    return {
      isApproved: true,
      feedback: "✅ Verificare automată locală — sarcină înregistrată! Părintele poate confirma vizual.",
      confidence: 0.5,
    };
  }
}
```

---

## Provider Factory

```typescript
// server/ai/providers/index.ts
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
      console.log(`[AI] Using provider: ${p.name}`);
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

export { AIProvider } from "./ai-provider.interface";
export type { ReadingResult, VisionResult } from "./ai-provider.interface";
```

---

## AI Service API

```typescript
// server/ai/index.ts
import { readingQueue, visionQueue, queueEvents } from "./jobs/queue";
import { getActiveProvider } from "./providers";

export const aiService = {
  /** Generează lectură — cu job queue */
  async generateReading(data: {
    topic: string;
    childId: string;
    readingStreak: number;
    age: number;
    customPrompt?: string;
    customQuestions?: string;
  }) {
    const job = await readingQueue.add("generate-reading", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
    return job.waitUntilFinished(queueEvents, 30_000);
  },

  /** Analizează imagine — cu job queue */
  async analyzeImage(data: {
    imageBase64: string;
    taskType: "dog_walk" | "chore";
    childName: string;
    age: number;
    taskDescription?: string;
  }) {
    const job = await visionQueue.add("analyze-image", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
    return job.waitUntilFinished(queueEvents, 30_000);
  },

  /** Apel direct (fără coadă) — pentru fallback rapid */
  async generateReadingDirect(data: {
    topic: string;
    childId: string;
    readingStreak: number;
    age: number;
  }) {
    const provider = getActiveProvider();
    return provider.generateReading(data.topic, data.childId, data.readingStreak, data.age);
  },
};
```

---

## Config `.env` — Variabile noi

```env
# ═══ AI Provider ═══
AI_PROVIDER=gemini          # gemini | openai | local
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key

# ═══ Redis (BullMQ) ═══
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Plan de Migrare

### Faza 1 — Creare module (1-2 zile)
- [ ] Creează `server/ai/providers/ai-provider.interface.ts`
- [ ] Mută `generateLocalReading` în `local.provider.ts`
- [ ] Creează `gemini.provider.ts` cu logica din `getGenAI()`
- [ ] Creează `openai.provider.ts` (schelet)
- [ ] Creează provider factory

### Faza 2 — Job queue (1-2 zile)
- [ ] Instalează `bullmq` + `ioredis`
- [ ] Configurare Redis (local sau Docker)
- [ ] Creează `server/ai/jobs/queue.ts`
- [ ] Creează `reading.job.ts` + `vision.job.ts`
- [ ] Creează `worker.ts`

### Faza 3 — Integrare în server.ts (1 zi)
- [ ] Înlocuiește `getGenAI()` → `aiService.generateReading()`
- [ ] Înlocuiește Gemini Vision → `aiService.analyzeImage()`
- [ ] Elimină `getGenAI()` din `server.ts`
- [ ] Elimină `generateLocalReading()` din `server.ts`
- [ ] Testează tot fluxul

### Faza 4 — Prompt templates (1 zi)
- [ ] Mută toate string-urile `systemInstruction` în `server/ai/prompts/`
- [ ] Parametrizează prompt-urile
- [ ] Adaugă suport pentru prompt-uri custom per familie

---

## Testing

```bash
# Test provider factory
curl http://localhost:3000/api/ai/status
# → { "provider": "gemini", "available": true, "queueLength": 0 }

# Test reading generation
curl -X POST http://localhost:3000/api/task/generate-reading \
  -H "Content-Type: application/json" \
  -d '{"childId":"dominic","topic":"Dinozauri"}'
```
