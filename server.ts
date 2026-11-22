import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

// Expose only client-side Maps JS API key if injected via GOOGLE_MAPS_API_KEY
app.get('/api/config', (_req, res) => {
  const googleMapsApiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  res.json({ googleMapsApiKey });
});

interface RescueMemberInput {
  displayName: string;
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
  availableCandidates: string[];
}

app.post('/api/ai-rescue', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: '伺服器尚未設定 GEMINI_API_KEY，請於 Settings > Secrets 確認環境變數。',
    });
    return;
  }

  const body = req.body as AiRescueBody;
  if (!body || !Array.isArray(body.members) || body.members.length === 0) {
    res.status(400).json({ error: '缺少群組成員資料，無法進行分析。' });
    return;
  }

  try {
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
        const favs = m.favoriteFoods?.length ? m.favoriteFoods.join('、') : '未填寫';
        const today = m.todayFoods?.length ? m.todayFoods.join('、') : '未特別指定';
        const moods = m.moodFilters?.length ? m.moodFilters.join('、') : '無特別禁忌';
        return `${idx + 1}. ${m.displayName}｜平時最愛：${favs}｜今日想食：${today}｜狀態與禁忌：${moods}｜預算上限：${m.budgetMax || '$$'}｜步行距離：${m.maxWalkKm || 2} 公里內`;
      })
      .join('\n');

    const rejectedText =
      body.rejectedFoods && body.rejectedFoods.length > 0
        ? body.rejectedFoods.join('、')
        : '暫無';

    const candidatesText =
      body.availableCandidates && body.availableCandidates.length > 0
        ? body.availableCandidates.join('、')
        : '全部選項已被狀態篩選衝突剔除，請從菜系融合中搵出折衷方案';

    const prompt = `
你係一個地道、風趣、好識做和事佬嘅香港朋友，負責幫《今日食咩好？》嘅飯局「${body.roomName || '今日飯局'}」做「AI 終極分析救場」。

以下係各位成員嘅詳細偏好同禁忌：
${memberDescriptions}

剛才輪盤轉過但被大家否決嘅選項：${rejectedText}
目前符合過濾後嘅候選名單：${candidatesText}

請你深度分析所有人之間嘅口味矛盾（例如有人想食清淡啲但有人想食重口味／打邊爐；有人唔食辣；有人想快食但有人想坐得舒服傾計），然後果斷拍板：
1. 必須全程使用地道香港繁體中文及廣東話口吻（用詞規定：用「漢堡扒」「牛肉飯」「意粉」「打邊爐」「米線」「車仔麵」「點心」「評分」「評論」「步行時間」，絕對唔好用台灣或內地用語）。
2. finalPick：只給出 1 個最能平衡所有人矛盾嘅具體菜式或餐廳類型（簡短清晰，例如「越南生熟牛肉河粉」或「日式一人鍋物 / 涮涮鍋」）。
3. searchKeyword：用嚟直接喺 Google Maps 搜尋附近餐廳嘅精準關鍵字（例如「越南河粉 餐廳」或「日式火鍋」）。
4. summaryTone：一句風趣幽默嘅和事佬總結開場白（40–80字）。
5. memberBreakdown：逐個成員寫 1 句拆解，格式為「成員名：點樣同時滿足佢嘅要求又避開佢嘅禁忌」。
6. backupName、backupKeyword、backupReason：提供 1 個完全唔同方向但同樣安全穩陣嘅後備 B 計劃。
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            finalPick: {
              type: Type.STRING,
              description: 'Final dish or cuisine recommendation balancing everyone.',
            },
            searchKeyword: {
              type: Type.STRING,
              description: 'Concise Google Maps search query in Traditional Chinese.',
            },
            summaryTone: {
              type: Type.STRING,
              description: 'Witty Hong Kong Cantonese mediator summary.',
            },
            memberBreakdown: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'One-sentence breakdown per member explaining how it satisfies them.',
            },
            backupName: {
              type: Type.STRING,
              description: 'Safe Plan B dish or cuisine name.',
            },
            backupKeyword: {
              type: Type.STRING,
              description: 'Google Maps search query for Plan B.',
            },
            backupReason: {
              type: Type.STRING,
              description: 'Why Plan B works as a safe compromise.',
            },
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

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Gemini AI 未能回傳有效分析結果，請再試一次。' });
      return;
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (error) {
    console.error('Gemini AI rescue error:', error);
    const message = error instanceof Error ? error.message : 'AI 分析服務暫時發生錯誤';
    res.status(500).json({ error: `AI 救場失敗：${message}` });
  }
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
