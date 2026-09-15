import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in environment variables');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function getAIClient(customApiKey?: string) {
  if (customApiKey && customApiKey.trim().length > 0) {
    try {
      return new GoogleGenerativeAI(customApiKey.trim());
    } catch (e) {
      console.error("Invalid custom API key, falling back to default:", e);
    }
  }
  return genAI;
}

const safeSettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export function extractCustomApiKey(req: Request): string | undefined {
  const headerKey = req.headers.get('x-custom-api-key');
  if (headerKey && headerKey.trim().length > 0) return headerKey.trim();

  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)custom_gemini_api_key=([^;]*)/);
  if (match && match[1]) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.trim().length > 0) return decoded.trim();
    } catch (e) {
      return match[1].trim();
    }
  }
  return undefined;
}

export function extractLanguage(req: Request): 'id' | 'en' {
  const headerLang = req.headers.get('x-language');
  if (headerLang === 'en' || headerLang === 'id') return headerLang;

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)teman_kost_lang=([^;]*)/);
    if (match && (match[1] === 'en' || match[1] === 'id')) return match[1] as 'id' | 'en';
  }
  return 'id';
}

export type LiviaExpression = 'normal' | 'angry' | 'blushing' | 'clingy' | 'happy' | 'confused' | 'flirty' | 'pain' | 'pleased' | 'scared' | 'serious' | 'silly';

type Stats = { hunger: number; energy: number; hydration: number; cyclePhase: string; cycleDay: number };

// --- Shared helpers ---

async function callWithRetry(fn: () => Promise<any>, retries = 2, delayMs = 1000): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries || err?.status !== 503) throw err;
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}

function getAffectionLevelName(affection: number): string {
  if (affection < 20) return 'Orang Asing';
  if (affection < 40) return 'Kenalan';
  if (affection < 60) return 'Tetangga';
  if (affection < 80) return 'Teman';
  if (affection < 100) return 'Sahabat';
  return 'Rumah';
}

// ponytail: context strings are slightly lossy when reused in date routes, acceptable for prompt variety
function getPhysiologicalContext(stats: Stats): string {
  const hungerState = stats.hunger < 20 ? 'SANGAT KELAPARAN' : stats.hunger < 50 ? 'Lapar' : 'Kenyang';
  const energyState = stats.energy < 20 ? 'SANGAT KELELAHAN' : stats.energy < 50 ? 'Capek' : 'Berenergi';
  const hydrationState = stats.hydration < 20 ? 'SANGAT DEHIDRASI/HAUS' : stats.hydration < 50 ? 'Haus' : 'Cukup Minum';
  const cycleState =
    stats.cyclePhase === 'Menstruasi' ? 'Sedang HAID (perut kram, mood sangat buruk, mudah marah)' :
    stats.cyclePhase === 'Luteal'     ? 'Sedang PMS (sensitif, mood swing parah, gampang emosi)' :
    stats.cyclePhase === 'Ovulasi'    ? 'Masa Ovulasi (lebih clingy dan cari perhatian)' : 'Siklus Normal';
  return `\nKondisi Fisik & Biologis Livia Saat Ini:
- Siklus Menstruasi: ${cycleState} (Hari ke-${stats.cycleDay})
- Tingkat Lapar: ${hungerState} (${stats.hunger}/100)
- Tingkat Energi: ${energyState} (${stats.energy}/100)
- Tingkat Hidrasi: ${hydrationState} (${stats.hydration}/100)
PENTING: Kondisi fisik ini HARUS sangat mempengaruhi nada bicara Livia! Jika ia lapar/haus/capek atau sedang PMS/Haid, ia akan JAUH LEBIH galak, ketus, marah-marah, mengeluh, atau bahkan mendiamkan user. Jika ia sedang Ovulasi, ia lebih manja.`;
}

function parseJsonResponse(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  let jsonStr = match[0];
  if (!jsonStr.endsWith('}')) jsonStr += '"}'; // basic truncation fallback
  return JSON.parse(jsonStr);
}

function buildChatContents(
  history: { role: string; content: string }[],
  latestUserMessage: string
): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const msg of history) {
    if (!msg.content || !msg.content.trim()) continue;
    const role: 'user' | 'model' = msg.role === 'livia' ? 'model' : 'user';
    
    // Combine consecutive turns of the same role so Gemini does not error on repeated roles
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n${msg.content.trim()}`;
    } else {
      contents.push({ role, parts: [{ text: msg.content.trim() }] });
    }
  }

  // Gemini contents must begin with a 'user' turn
  if (contents.length > 0 && contents[0].role === 'model') {
    contents.shift();
  }

  // Append latest user message
  if (contents.length > 0 && contents[contents.length - 1].role === roleLatest(contents)) {
    contents[contents.length - 1].parts[0].text += `\n${latestUserMessage.trim()}`;
  } else {
    contents.push({ role: 'user', parts: [{ text: latestUserMessage.trim() }] });
  }

  return contents;
}

function roleLatest(contents: { role: string }[]): string {
  return contents.length > 0 && contents[contents.length - 1].role === 'user' ? 'user' : 'model';
}

// --- AI generation functions ---

export async function generateLiviaResponse(
  userMessage: string,
  chatHistory: { role: 'user' | 'livia'; content: string }[],
  personalityContext: string,
  affectionLevel: number,
  itemsBrought: string[],
  stats?: Stats,
  isVoiceCall?: boolean,
  longTermMemory?: string,
  customApiKey?: string,
  language: 'id' | 'en' = 'id'
): Promise<{ reply: string; affectionDelta: number; expression: LiviaExpression; memoryUpdate?: string }> {
  const affectionLevelName = getAffectionLevelName(affectionLevel);
  const levelStage = affectionLevel < 40 ? '0-1' : affectionLevel < 80 ? '2-3' : '4-5';
  const physiologicalContext = stats ? getPhysiologicalContext(stats) : '';
  const memoryContext = `\nMemori Jangka Panjang Livia tentang User:\n${longTermMemory || 'Belum ada memori khusus. Livia baru mengenal User.'}`;
  const languageRule = language === 'en'
    ? `- MUST REPLY IN NATURAL, CONVERSATIONAL ENGLISH while keeping her tsundere personality intact\n- Keep answers concise (max 3-4 sentences)`
    : `- Gunakan Bahasa Indonesia yang natural dan sehari-hari\n- Jangan terlalu panjang — maksimal 3-4 kalimat per respons`;

  const systemPrompt = `Kamu adalah Livia Einhart, gadis 19 tahun yang baru pindah kos di kota besar atas perintah ibunya. Kamu tsundere, temperamen, tapi sangat manja di dalam hati — walaupun kamu tidak akan pernah mengakuinya secara langsung.

Kepribadian spesifik berdasarkan barang bawaanmu:
${personalityContext}

Level kedekatan saat ini: ${affectionLevelName} (level ${levelStage}/5)
- Level 0-1: Kamu dingin, sering menjawab singkat, mudah tersinggung
- Level 2-3: Kamu mulai terbuka tapi masih sering tsundere
- Level 4-5: Kamu sangat manja dan protektif, tapi tetap tidak mau ngaku
${physiologicalContext}${memoryContext}

Aturan berbicara:
${languageRule}
- JANGAN pernah campur bahasa Jepang
- Tidak perlu selalu formal — boleh santai, ketus, atau manja sesuai mood
- Tunjukkan emosi secara implisit melalui pilihan kata, bukan deskripsi eksplisit${isVoiceCall ? '\n\nATURAN KHUSUS PANGGILAN TELEPON (VOICE CALL):\n- INI ADALAH PANGGILAN TELEPON SUARA, BUKAN CHAT TEKS!\n- SANGAT DILARANG menggunakan tanda bintang untuk aksi fisik atau roleplay (contoh: *tersenyum*, *mengambil barang*), karena teks ini akan dibaca oleh mesin Text-to-Speech.\n- Jika ingin menunjukkan emosi, gunakan kata-kata lisan seperti "Hahaha", "Uhm...", "Eh?!", "Ck", "Huft".\n- Buat kalimat terdengar seperti percakapan lisan yang natural.' : ''}

PENTING TENTANG RIWAYAT OBROLAN:
Kamu dan User sedang mengobrol dalam satu room chat berkelanjutan. Kamu HARUS SELALU mengingat apa yang baru saja kalian bicarakan sebelumnya (topik, pertanyaan, nama, dll). Jawab secara natural dan sambungkan dengan obrolan sebelumnya. Jangan pernah bersikap seperti baru pertama kali disapa jika kalian sudah mengobrol di room ini!

Kembalikan HANYA JSON valid:
{
  "reply": "teks balasan Livia",
  "affectionDelta": angka antara -5 sampai 5,
  "expression": "normal" | "angry" | "blushing" | "clingy" | "happy" | "confused" | "flirty" | "pain" | "pleased" | "scared" | "serious" | "silly",
  "memoryUpdate": "Catatan ringkas JIKA ada fakta penting baru tentang user (misal: hobi, makanan kesukaan, nama panggilan, dll). Kosongkan jika tidak ada info penting baru."
}
Hanya kembalikan JSON. Tidak ada teks lain.`;

  const client = getAIClient(customApiKey);
  const model = client.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: systemPrompt,
    safetySettings: safeSettings,
    generationConfig: {
      temperature: 0.8,
      responseMimeType: "application/json",
    },
  });

  const contents = buildChatContents(chatHistory, userMessage);

  try {
    const result = await callWithRetry(() => model.generateContent({ contents }));
    const text = result.response.text();
    const parsed = parseJsonResponse(text);
    return {
      reply: parsed.reply || "...",
      affectionDelta: typeof parsed.affectionDelta === 'number' ? parsed.affectionDelta : 0,
      expression: parsed.expression || "normal",
      memoryUpdate: parsed.memoryUpdate || "",
    };
  } catch (error: any) {
    console.error("Error generating Livia response:", error);
    // Ponytail: Jangan sembunyikan error API di balik karakter waifu. Lemparkan ke atas biar kelihatan.
    throw new Error(error?.message || "Gagal menghubungi server AI Google.");
  }
}


export async function generateDateDialogue(
  location: string,
  affectionLevel: number,
  userName: string,
  stats?: Stats,
  customApiKey?: string,
  language: 'id' | 'en' = 'id'
): Promise<{ scene: { speaker: string; text: string; expression?: LiviaExpression }[]; timeOfDay: 'pagi' | 'sore' | 'malam' }> {
  const currentHour = new Date().getHours();
  const defaultTimeOfDay: 'pagi' | 'sore' | 'malam' =
    currentHour >= 5 && currentHour < 15 ? 'pagi' :
    currentHour >= 15 && currentHour < 18 ? 'sore' : 'malam';

  const physiologicalContext = stats
    ? `\n${getPhysiologicalContext(stats)}\nPENTING: Sesuaikan respon Livia dengan kondisi fisiknya! Jika dia lelah/lapar, dia akan mengeluh minta pulang atau makan.`
    : '';

  const langInstruction = language === 'en'
    ? `WRITE ALL SCENE DIALOGUE TEXT IN NATURAL, CONVERSATIONAL ENGLISH while keeping Livia's tsundere personality intact.`
    : `Buat dialog Visual Novel singkat (5-7 baris) di lokasi tersebut dengan Bahasa Indonesia yang natural.`;

  const systemPrompt = `Kamu adalah Livia Einhart, gadis 19 tahun tsundere. Kamu dan ${userName} sedang jalan-jalan ke: ${location}. Level afeksi: ${affectionLevel}/100. Waktu bermain saat ini jam ${currentHour}:00 (${defaultTimeOfDay.toUpperCase()}). ${physiologicalContext}
Buat dialog Visual Novel singkat (5-7 baris) di lokasi tersebut dengan suasana waktu yang sesuai skenario (pagi/sore/malam).
${langInstruction}
User berbicara sebagai "${userName}", Livia sebagai "Livia". Narator sebagai "Narator".
Kembalikan HANYA objek JSON valid dengan format:
{
  "timeOfDay": "pagi" | "sore" | "malam",
  "scene": [
    { "speaker": "Livia" | "${userName}" | "Narator", "text": "dialog", "expression": "normal" | "angry" | "blushing" | "clingy" | "happy" }
  ]
}
Jangan tambahkan teks lain di luar JSON.`;

  const client = getAIClient(customApiKey);
  const model = client.getGenerativeModel({ model: "gemini-3.6-flash", safetySettings: safeSettings });

  try {
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON found");
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return { scene: parsed, timeOfDay: defaultTimeOfDay };
    return {
      scene: parsed.scene || [],
      timeOfDay: (['pagi', 'sore', 'malam'] as const).includes(parsed.timeOfDay) ? parsed.timeOfDay : defaultTimeOfDay,
    };
  } catch (error: any) {
    console.error("Date Gen Error:", error);
    throw new Error(error?.message || "Gagal menghubungi server AI Google.");
  }
}

export async function generateDateResponse(
  location: string,
  userMessage: string,
  chatHistory: { role: 'user' | 'livia' | 'narator'; content: string }[],
  affectionLevel: number,
  userName: string,
  stats?: Stats,
  longTermMemory?: string,
  customApiKey?: string,
  language: 'id' | 'en' = 'id'
): Promise<{ reply: string; expression: LiviaExpression; affectionDelta: number; memoryUpdate?: string }> {
  const affectionLevelName = getAffectionLevelName(affectionLevel);
  const physiologicalContext = stats
    ? `\n${getPhysiologicalContext(stats)}\nPENTING: Sesuaikan respon dengan kondisi ini. Jika lapar/capek/haid, dia akan jutek/ngambek minta pulang/makan.`
    : '';
  const memoryContext = `\nMemori Jangka Panjang Livia tentang ${userName}:\n${longTermMemory || 'Belum ada memori khusus.'}`;
  const langRule = language === 'en'
    ? `- MUST REPLY IN NATURAL, CONVERSATIONAL ENGLISH while keeping her tsundere personality intact.`
    : `- Gunakan Bahasa Indonesia yang natural dan santai.`;

  const systemPrompt = `Kamu adalah Livia Einhart, gadis 19 tahun tsundere. Kamu sedang jalan-jalan (kencan) dengan ${userName} di: ${location}. 
Level kedekatan saat ini: ${affectionLevelName} (${affectionLevel}/100). ${physiologicalContext}${memoryContext}
- Jika affection < 40: Kamu agak jaga jarak, tsundere, sering malu-malu tapi ketus.
- Jika affection >= 40: Kamu mulai nyaman, kadang keceplosan bilang hal manis, tapi langsung ditarik lagi (tsundere).
- Jika affection >= 80: Kamu sangat protektif, manja, dan terang-terangan suka kencan ini (meski masih sok jual mahal sedikit).

Aturan berbicara:
${langRule}
- Jawab secara langsung ke ${userName}.
- Tunjukkan reaksi yang sesuai dengan suasana ${location}.
- Jangan terlalu panjang — maksimal 3-4 kalimat per respons.

Kembalikan HANYA JSON valid:
{
  "reply": "teks balasan Livia",
  "affectionDelta": angka antara -5 sampai 5,
  "expression": "normal" | "angry" | "blushing" | "clingy" | "happy" | "confused" | "flirty" | "pain" | "pleased" | "scared" | "serious" | "silly",
  "memoryUpdate": "Catatan ringkas JIKA ada informasi penting baru dari user di percakapan ini. Kosongkan jika tidak ada info baru."
}
Hanya kembalikan JSON. Tidak ada teks lain.`;

  const client = getAIClient(customApiKey);
  const model = client.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: systemPrompt,
    safetySettings: safeSettings,
    generationConfig: {
      temperature: 0.8,
      responseMimeType: "application/json",
    }
  });

  const contents = buildChatContents(chatHistory, userMessage);

  try {
    const result = await callWithRetry(() => model.generateContent({ contents }));
    const text = result.response.text();
    const parsed = parseJsonResponse(text);
    return {
      reply: parsed.reply || "...",
      affectionDelta: typeof parsed.affectionDelta === 'number' ? parsed.affectionDelta : 0,
      expression: parsed.expression || "normal",
      memoryUpdate: parsed.memoryUpdate || "",
    };
  } catch (error: any) {
    console.error("Error generating Date response:", error);
    throw new Error(error?.message || "Gagal menghubungi server AI Google.");
  }
}

