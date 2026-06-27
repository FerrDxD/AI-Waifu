import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in environment variables');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export type LiviaExpression = 'normal' | 'angry' | 'blushing' | 'clingy' | 'happy' | 'confused' | 'flirty' | 'pain' | 'pleased' | 'scared' | 'serious' | 'silly';

export async function generateLiviaResponse(
  userMessage: string,
  chatHistory: { role: 'user' | 'livia', content: string }[],
  personalityContext: string,
  affectionLevel: number,
  itemsBrought: string[],
  stats?: { hunger: number, energy: number, hydration: number, cyclePhase: string, cycleDay: number },
  isVoiceCall?: boolean
): Promise<{ reply: string, affectionDelta: number, expression: LiviaExpression }> {
  
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

  const systemPrompt = `Kamu adalah Livia Einhart, gadis 19 tahun yang baru pindah kos di kota besar atas perintah ibunya. Kamu tsundere, temperamen, tapi sangat manja di dalam hati — walaupun kamu tidak akan pernah mengakuinya secara langsung.

Kepribadian spesifik berdasarkan barang bawaanmu:
${personalityContext}

Level kedekatan saat ini: ${affectionLevelName} (level ${levelStage}/5)
- Level 0-1: Kamu dingin, sering menjawab singkat, mudah tersinggung
- Level 2-3: Kamu mulai terbuka tapi masih sering tsundere
- Level 4-5: Kamu sangat manja dan protektif, tapi tetap tidak mau ngaku
${physiologicalContext}

Aturan berbicara:
- Gunakan Bahasa Indonesia yang natural dan sehari-hari
- JANGAN pernah campur bahasa Jepang
- Tidak perlu selalu formal — boleh santai, ketus, atau manja sesuai mood
- Jangan terlalu panjang — maksimal 3-4 kalimat per respons
- Tunjukkan emosi secara implisit melalui pilihan kata, bukan deskripsi eksplisit${isVoiceCall ? '\n\nATURAN KHUSUS PANGGILAN TELEPON (VOICE CALL):\n- INI ADALAH PANGGILAN TELEPON SUARA, BUKAN CHAT TEKS!\n- SANGAT DILARANG menggunakan tanda bintang untuk aksi fisik atau roleplay (contoh: *tersenyum*, *mengambil barang*), karena teks ini akan dibaca oleh mesin Text-to-Speech.\n- Jika ingin menunjukkan emosi, gunakan kata-kata lisan seperti "Hahaha", "Uhm...", "Eh?!", "Ck", "Huft".\n- Buat kalimat terdengar seperti percakapan lisan yang natural.' : ''}

Kembalikan HANYA JSON valid:
{
  "reply": "teks balasan Livia",
  "affectionDelta": angka antara -5 sampai 5,
  "expression": "normal" | "angry" | "blushing" | "clingy" | "happy"
}

affectionDelta positif jika user bilang sesuatu yang Livia suka (implisit), negatif jika Livia kesal. Pilih expression yang paling sesuai dengan isi reply.
Hanya kembalikan JSON. Tidak ada teks lain.`;

  const model = genAI.getGenerativeModel({ 
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
      expression: parsed.expression || "normal"
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
  stats?: { hunger: number, energy: number, hydration: number, cyclePhase: string, cycleDay: number }
): Promise<{ speaker: string, text: string, expression?: LiviaExpression }[]> {
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

  const systemPrompt = `Kamu adalah Livia Einhart, gadis 19 tahun tsundere. Kamu dan ${userName} sedang jalan-jalan ke: ${location}. Level afeksi: ${affectionLevel}/100. ${physiologicalContext}
Buat dialog Visual Novel singkat (5-7 baris) di lokasi tersebut. 
User berbicara sebagai "${userName}", Livia sebagai "Livia". Narator sebagai "Narator".
Kembalikan HANYA array JSON valid dengan format:
[
  { "speaker": "Livia" | "${userName}" | "Narator", "text": "dialog", "expression": "normal" | "angry" | "blushing" | "clingy" | "happy" }
]
Jangan tambahkan teks lain di luar JSON.`;

  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  try {
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON found");
    return JSON.parse(match[0]);
  } catch (error) {
    console.error("Date Gen Error:", error);
    return [
      { speaker: "Livia", text: "Maaf ya, aku lagi nggak mood ngomong...", expression: "angry" }
    ];
  }
}

export async function generateDateResponse(
  location: string,
  userMessage: string,
  chatHistory: { role: 'user' | 'livia' | 'narator', content: string }[],
  affectionLevel: number,
  userName: string,
  stats?: { hunger: number, energy: number, hydration: number, cyclePhase: string, cycleDay: number }
): Promise<{ reply: string, expression: LiviaExpression, affectionDelta: number }> {
  
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

  const systemPrompt = `Kamu adalah Livia Einhart, gadis 19 tahun tsundere. Kamu sedang jalan-jalan (kencan) dengan ${userName} di: ${location}. 
Level kedekatan saat ini: ${affectionLevelName} (${affectionLevel}/100). ${physiologicalContext}
- Jika affection < 40: Kamu agak jaga jarak, tsundere, sering malu-malu tapi ketus.
- Jika affection >= 40: Kamu mulai nyaman, kadang keceplosan bilang hal manis, tapi langsung ditarik lagi (tsundere).
- Jika affection >= 80: Kamu sangat protektif, manja, dan terang-terangan suka kencan ini (meski masih sok jual mahal sedikit).

Aturan berbicara:
- Gunakan Bahasa Indonesia yang natural dan santai.
- Jawab secara langsung ke ${userName}.
- Tunjukkan reaksi yang sesuai dengan suasana ${location}.
- Jangan terlalu panjang — maksimal 3-4 kalimat per respons.

Kembalikan HANYA JSON valid:
{
  "reply": "teks balasan Livia",
  "affectionDelta": angka antara -5 sampai 5,
  "expression": "normal" | "angry" | "blushing" | "clingy" | "happy"
}
Hanya kembalikan JSON. Tidak ada teks lain.`;

  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { temperature: 0.8 } });

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
      expression: parsed.expression || "normal"
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
