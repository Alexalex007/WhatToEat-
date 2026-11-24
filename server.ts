import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

// Expose only client-side Maps JS API key if injected via environment
app.get('/api/config', (_req, res) => {
  const googleMapsApiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  res.json({ googleMapsApiKey });
});

interface RescueMemberInput {
  displayName: string;
  mealPeriod?: string;
  selectedCuisines: string[];
  selectedFormats?: string[];
  favoriteFoods: string[];
  todayFoods: string[];
  moodFilters: string[];
  budgetMax: string;
  maxWalkKm: number;
}

interface AiRescueBody {
  roomName: string;
  members: RescueMemberInput[];
  rejectedFoods: string[];
  recentMealsWithin7Days: string[];
  availableCandidates: string[];
}

function parseJsonResponse(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(candidate) as Record<string, unknown>;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.post('/api/ai-rescue', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: '尚未設定 GEMINI_API_KEY，請喺 AI Studio Settings > Secrets 檢查環境變數。',
    });
    return;
  }

  const body = req.body as AiRescueBody;
  if (!body || !Array.isArray(body.members) || body.members.length === 0) {
    res.status(400).json({ error: '缺少成員口味資料，請至少有一位成員先進行分析。' });
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const memberDescriptions = body.members
    .map((m, idx) => {
      const period = m.mealPeriod || '晚餐';
      const cuisines = m.selectedCuisines?.length ? m.selectedCuisines.join('、') : '未指定菜系';
      const formats = m.selectedFormats?.length ? m.selectedFormats.join('、') : '不限菜式類型';
      const today = m.todayFoods?.length ? m.todayFoods.join('、') : '未特別指定';
      const favs = m.favoriteFoods?.length ? m.favoriteFoods.join('、') : '無';
      const moods = m.moodFilters?.length ? m.moodFilters.join('、') : '無特別要求';
      return `${idx + 1}. ${m.displayName}｜時段：${period}｜想食菜系：${cuisines}｜想食類型：${formats}｜今日揀咗：${today}｜平時常食：${favs}｜要求／禁忌：${moods}｜預算：${m.budgetMax || '$$'}｜距離：${m.maxWalkKm || 2}km 內`;
    })
    .join('\n');

  const recent7DaysText =
    body.recentMealsWithin7Days && body.recentMealsWithin7Days.length > 0
      ? body.recentMealsWithin7Days.join('、')
      : '無';

  const rejectedText =
    body.rejectedFoods && body.rejectedFoods.length > 0
      ? body.rejectedFoods.join('、')
      : '無';

  const candidatesText =
    body.availableCandidates && body.availableCandidates.length > 0
      ? body.availableCandidates.join('、')
      : '候選池暫空，請根據成員菜系同禁忌重新度身推薦';

  const prompt = `
幫「${body.roomName || '今日飯局'}」分析所有人嘅餐飲選擇並拍板決定今餐食咩。

成員資料：
${memberDescriptions}

一星期內本房已經食過（必須避開，唔好重複推薦）：${recent7DaysText}
今日輪盤否決咗（唔好再揀）：${rejectedText}
現有候選菜式：${candidatesText}

規則：
1. 全程使用簡潔、自然嘅香港繁體中文（用詞：漢堡扒、牛肉飯、意粉、打邊爐、米線、車仔麵、點心、評分、評論、步行時間）。語氣直接實用，唔好講誇張、中二病或廢話。
2. finalPick 同 backupName 絕對唔可以同「一星期內已食過」或「輪盤否決咗」嘅菜式重複。
3. 必須同時尊重所有人嘅禁忌（例如唔食辣、少煎炸、食清淡啲）同菜系偏好，搵出最平衡大家預算同距離嘅選項。
4. finalPick：1 個具體菜式／餐廳類型（例如「海南雞飯」、「日式涮涮鍋」、「越南生牛肉河粉」）。
5. searchKeyword：適合直接喺 Google Maps 搜尋附近餐廳嘅簡短關鍵字。
6. summaryTone：1-2 句精簡說明點解呢個選擇最夾大家（50 字內）。
7. memberBreakdown：每個成員 1 句簡短對應說明（格式：「成員名：原因」）。
8. backupName、backupKeyword、backupReason：提供 1 個唔同風格但安全穩陣嘅後備方案。
`;

  const modelAttempts: { model: string; thinkingLevel?: ThinkingLevel; delayMs: number }[] = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayMs: 0 },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayMs: 500 },
    { model: 'gemini-3.1-flash-lite', delayMs: 300 },
  ];

  let lastError: unknown = null;
  for (const attempt of modelAttempts) {
    if (attempt.delayMs > 0) {
      await sleep(attempt.delayMs);
    }
    try {
      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: prompt,
        config: {
          ...(attempt.thinkingLevel
            ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
            : {}),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              finalPick: { type: Type.STRING },
              searchKeyword: { type: Type.STRING },
              summaryTone: { type: Type.STRING },
              memberBreakdown: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              backupName: { type: Type.STRING },
              backupKeyword: { type: Type.STRING },
              backupReason: { type: Type.STRING },
            },
            required: [
              'finalPick',
              'searchKeyword',
              'summaryTone',
              'memberBreakdown',
              'backupName',
              'backupKeyword',
              'backupReason',
            ],
          },
        },
      });

      const rawText = response.text || '';
      if (!rawText.trim()) {
        throw new Error('AI 未有回傳內容');
      }

      const parsed = parseJsonResponse(rawText);
      if (typeof parsed.finalPick !== 'string' || !parsed.finalPick.trim()) {
        throw new Error('AI 回傳格式不完整');
      }

      res.json(parsed);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Gemini AI (${attempt.model}) failed:`, error);
    }
  }

  const errObj = lastError as { status?: number; message?: string } | undefined;
  const status = errObj?.status;
  const msg = errObj?.message || 'AI 分析暫時未能完成，請稍後再試。';

  if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    res.status(429).json({
      error: 'Gemini API 請求達到上限（429），請稍等一陣再試，或於 Settings > Secrets 檢查 API 配額。',
    });
    return;
  }
  if (status === 403 || status === 400 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
    res.status(403).json({
      error: 'Gemini API 金鑰權限無效，請於 Settings > Secrets 檢查 GEMINI_API_KEY。',
    });
    return;
  }
  if (status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE')) {
    res.status(503).json({
      error: 'Gemini AI 伺服器暫時繁忙，請幾秒後再試。',
    });
    return;
  }

  res.status(502).json({ error: `AI 推薦失敗：${msg}` });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
