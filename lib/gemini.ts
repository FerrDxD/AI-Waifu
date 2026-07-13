import { GoogleGenerativeAI } from '@google/generative-ai';

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

export async function generateLiviaResponse(
  userMessage: string,
  chatHistory: { role: 'user' | 'livia', content: string }[],
  personalityContext: string,
  affectionLevel: number,
  itemsBrought: string[],
  stats?: { hunger: number, energy: number, hydration: number, cyclePhase: string, cycleDay: number },
  isVoiceCall?: boolean,
  longTermMemory?: string,
  customApiKey?: string,
  language: 'id' | 'en' = 'id'
): Promise<{ reply: string, affectionDelta: number, expression: LiviaExpression, memoryUpdate?: string }> {
  
  const affectionLevelName = affectionLevel < 20 ? 'Orang Asing' :
                             affectionLevel < 40 ? 'Kenalan' :
                             affectionLevel < 60 ? 'Tetangga' :
                             affectionLevel < 80 ? 'Teman' :
                             affectionLevel < 100 ? 'Sahabat' : 'Rumah';
                             
  const levelStage = affectionLevel < 40 ? '0-1' : affectionLevel < 80 ? '2-3' : '4-5';

  let physiologicalContext = '';
  if (stats) {
    let hungerState = stats.hunger < 20 ? 'SANGAT KELAPARAN' : stats.hunger < 50 ? 'Lapar' : 'Kenyang';
    let energyState = stats.energy < 20 ? 'SANGAT KELELAHAN' : stats.energy < 50 ? 'Capek' : 'Berenergi';
    let hydrationState = stats.hydration < 20 ? 'SANGAT DEHIDRASI/HAUS' : stats.hydration < 50 ? 'Haus' : 'Cukup Minum';
    let cycleState = stats.cyclePhase === 'Menstruasi' ? 'Sedang HAID (perut kram, mood sangat buruk, mudah marah)' :
                     stats.cyclePhase === 'Luteal' ? 'Sedang PMS (sensitif, mood swing parah, gampang emosi)' :
                     stats.cyclePhase === 'Ovulasi' ? 'Masa Ovulasi (lebih clingy dan cari perhatian)' : 'Siklus Normal';

    physiologicalContext = `\nKondisi Fisik & Biologis Livia Saat Ini:
- Siklus Menstruasi: ${cycleState} (Hari ke-${stats.cycleDay})
- Tingkat Lapar: ${hungerState} (${stats.hunger}/100)
- Tingkat Energi: ${energyState} (${stats.energy}/100)
- Tingkat Hidrasi: ${hydrationState} (${stats.hydration}/100)
PENTING: Kondisi fisik ini HARUS sangat mempengaruhi nada bicara Livia! Jika ia lapar/haus/capek atau sedang PMS/Haid, ia akan JAUH LEBIH galak, ketus, marah-marah, mengeluh, atau bahkan mendiamkan user. Jika ia sedang Ovulasi, ia lebih manja.`;
  }

  const memoryContext = `\nMemori Jangka Panjang Livia tentang User:
${longTermMemory || 'Belum ada memori. Livia baru mengenal User.'}`;

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

Kembalikan HANYA JSON valid:
{
  "reply": "teks balasan Livia",
  "affectionDelta": angka antara -5 sampai 5,
  "expression": "normal" | "angry" | "blushing" | "clingy" | "happy" | "confused" | "flirty" | "pain" | "pleased" | "scared" | "serious" | "silly",
  "memoryUpdate": "Catatan ringkas JIKA ada informasi penting baru dari user di chat ini (misal: user sedang skripsi, nama hewan peliharaan user, dll). Kosongkan (string kosong) jika tidak ada info penting baru."
}

affectionDelta positif jika user bilang sesuatu yang Livia suka (implisit), negatif jika Livia kesal. Pilih expression yang paling sesuai dengan isi reply.
Hanya kembalikan JSON. Tidak ada teks lain.`;

  const client = getAIClient(customApiKey);
  const model = client.getGenerativeModel({ 
    model: "gemini-flash-latest",
    generationConfig: {
      temperature: 0.8,
    }
  });

  // Format history manually into the prompt to avoid chat history role conflicts
  const formattedHistory = chatHistory.map(msg => 
    `${msg.role === 'livia' ? 'Livia' : 'User'}: ${msg.content}`
  ).join('\n');

  const fullPrompt = `${systemPrompt}

Riwayat obrolan sejauh ini:
${formattedHistory}

User: ${userMessage}
Livia:`;

  try {
    const result = await callWithRetry(() => model.generateContent(fullPrompt));
    const text = result.response.text();
    console.log("Raw Gemini Output:", text);
    
    // Cari blok JSON dengan regex
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");
    
    // Coba tambahkan tutup kurung jika terpotong
    let jsonStr = match[0];
    if (!jsonStr.endsWith('}')) jsonStr += '"}'; // basic fallback
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      reply: parsed.reply || "...",
      affectionDelta: parsed.affectionDelta || 0,
      expression: parsed.expression || "normal",
      memoryUpdate: parsed.memoryUpdate || ""
    };
  } catch (error) {
    console.error("Error generating Livia response:", error);
    return {
      reply: "Apa sih? Jangan ganggu aku dulu.",
      affectionDelta: -1,
      expression: "angry"
    };
  }

  async function callWithRetry(fn: () => Promise<any>, retries = 2, delayMs = 1000) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i === retries || err?.status !== 503) throw err;
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }
}

export async function generateDateDialogue(
  location: string,
  affectionLevel: number,
  userName: string,
  stats?: { hunger: number, energy: number, hydration: number, cyclePhase: string, cycleDay: number },
  customApiKey?: string,
  language: 'id' | 'en' = 'id'
): Promise<{ scene: { speaker: string, text: string, expression?: LiviaExpression }[], timeOfDay: 'pagi' | 'sore' | 'malam' }> {
  const currentHour = new Date().getHours();
  const defaultTimeOfDay: 'pagi' | 'sore' | 'malam' =
    currentHour >= 5 && currentHour < 15 ? 'pagi' :
    currentHour >= 15 && currentHour < 18 ? 'sore' : 'malam';

  let physiologicalContext = '';
  if (stats) {
    let hungerState = stats.hunger < 20 ? 'SANGAT KELAPARAN' : stats.hunger < 50 ? 'Lapar' : 'Kenyang';
    let energyState = stats.energy < 20 ? 'SANGAT KELELAHAN' : stats.energy < 50 ? 'Capek' : 'Berenergi';
    let hydrationState = stats.hydration < 20 ? 'SANGAT DEHIDRASI/HAUS' : stats.hydration < 50 ? 'Haus' : 'Cukup Minum';
    let cycleState = stats.cyclePhase === 'Menstruasi' ? 'Sedang HAID (perut kram, mood sangat buruk, mudah marah)' :
                     stats.cyclePhase === 'Luteal' ? 'Sedang PMS (sensitif, mood swing parah, gampang emosi)' :
                     stats.cyclePhase === 'Ovulasi' ? 'Masa Ovulasi (lebih clingy dan cari perhatian)' : 'Siklus Normal';

    physiologicalContext = `\nKondisi Fisik & Biologis Livia Saat Ini:\n- Siklus Menstruasi: ${cycleState}\n- Tingkat Lapar: ${hungerState}\n- Tingkat Energi: ${energyState}\n- Tingkat Hidrasi: ${hydrationState}\nPENTING: Sesuaikan respon Livia dengan kondisi fisiknya! Jika dia lelah/lapar, dia akan mengeluh minta pulang atau makan.`;
  }

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
  const model = client.getGenerativeModel({ model: "gemini-flash-latest" });

  try {
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON found");
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) {
      return { scene: parsed, timeOfDay: defaultTimeOfDay };
    }
    return {
      scene: parsed.scene || [],
      timeOfDay: (parsed.timeOfDay === 'pagi' || parsed.timeOfDay === 'sore' || parsed.timeOfDay === 'malam') ? parsed.timeOfDay : defaultTimeOfDay
    };
  } catch (error) {
    console.error("Date Gen Error:", error);
    return {
      scene: [
        { speaker: "Livia", text: "Maaf ya, aku lagi nggak mood ngomong...", expression: "angry" }
      ],
      timeOfDay: defaultTimeOfDay
    };
  }
}

export async function generateDateResponse(
  location: string,
  userMessage: string,
  chatHistory: { role: 'user' | 'livia' | 'narator', content: string }[],
  affectionLevel: number,
  userName: string,
  stats?: { hunger: number, energy: number, hydration: number, cyclePhase: string, cycleDay: number },
  longTermMemory?: string,
  customApiKey?: string,
  language: 'id' | 'en' = 'id'
): Promise<{ reply: string, expression: LiviaExpression, affectionDelta: number, memoryUpdate?: string }> {
  
  const affectionLevelName = affectionLevel < 20 ? 'Orang Asing' :
                             affectionLevel < 40 ? 'Kenalan' :
                             affectionLevel < 60 ? 'Tetangga' :
                             affectionLevel < 80 ? 'Teman' :
                             affectionLevel < 100 ? 'Sahabat' : 'Rumah';
                             
  let physiologicalContext = '';
  if (stats) {
    let hungerState = stats.hunger < 20 ? 'SANGAT KELAPARAN' : stats.hunger < 50 ? 'Lapar' : 'Kenyang';
    let energyState = stats.energy < 20 ? 'SANGAT KELELAHAN' : stats.energy < 50 ? 'Capek' : 'Berenergi';
    let hydrationState = stats.hydration < 20 ? 'SANGAT DEHIDRASI/HAUS' : stats.hydration < 50 ? 'Haus' : 'Cukup Minum';
    let cycleState = stats.cyclePhase === 'Menstruasi' ? 'Sedang HAID (perut kram, mood sangat buruk, mudah marah)' :
                     stats.cyclePhase === 'Luteal' ? 'Sedang PMS (sensitif, mood swing parah, gampang emosi)' :
                     stats.cyclePhase === 'Ovulasi' ? 'Masa Ovulasi (lebih clingy dan cari perhatian)' : 'Siklus Normal';

    physiologicalContext = `\nKondisi Fisik & Biologis Livia: Siklus ${cycleState}, Lapar: ${hungerState}, Energi: ${energyState}, Hidrasi: ${hydrationState}.\nPENTING: Sesuaikan respon dengan kondisi ini. Jika lapar/capek/haid, dia akan jutek/ngambek minta pulang/makan.`;
  }

  const memoryContext = `\nMemori Jangka Panjang Livia tentang ${userName}:
${longTermMemory || 'Belum ada memori khusus.'}`;

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
  const model = client.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { temperature: 0.8 } });

  const formattedHistory = chatHistory.map(msg => 
    `${msg.role === 'livia' ? 'Livia' : msg.role === 'narator' ? 'Narator' : 'User'}: ${msg.content}`
  ).join('\n');

  const fullPrompt = `${systemPrompt}

Riwayat obrolan kencan sejauh ini:
${formattedHistory}

User (${userName}): ${userMessage}
Livia:`;

  try {
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");
    
    let jsonStr = match[0];
    if (!jsonStr.endsWith('}')) jsonStr += '"}';
    const parsed = JSON.parse(jsonStr);
    
    return {
      reply: parsed.reply || "...",
      affectionDelta: parsed.affectionDelta || 0,
      expression: parsed.expression || "normal",
      memoryUpdate: parsed.memoryUpdate || ""
    };
  } catch (error) {
    console.error("Error generating Date response:", error);
    return {
      reply: "Apa sih? Jangan ngomong yang aneh-aneh di tempat umum.",
      affectionDelta: -1,
      expression: "angry"
    };
  }
}
