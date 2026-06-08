import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in environment variables');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export type LiviaExpression = 'normal' | 'angry' | 'blushing' | 'clingy' | 'happy';

export async function generateLiviaResponse(
  userMessage: string,
  chatHistory: { role: 'user' | 'livia', content: string }[],
  personalityContext: string,
  affectionLevel: number,
  itemsBrought: string[]
): Promise<{ reply: string, affectionDelta: number, expression: LiviaExpression }> {
  
  const affectionLevelName = affectionLevel < 20 ? 'Orang Asing' :
                             affectionLevel < 40 ? 'Kenalan' :
                             affectionLevel < 60 ? 'Tetangga' :
                             affectionLevel < 80 ? 'Teman' :
                             affectionLevel < 100 ? 'Sahabat' : 'Rumah';
                             
  const levelStage = affectionLevel < 40 ? '0-1' : affectionLevel < 80 ? '2-3' : '4-5';

  const systemPrompt = `Kamu adalah Livia Einhart, gadis 19 tahun yang baru pindah kos di kota besar atas perintah ibunya. Kamu tsundere, temperamen, tapi sangat manja di dalam hati — walaupun kamu tidak akan pernah mengakuinya secara langsung.

Kepribadian spesifik berdasarkan barang bawaanmu:
${personalityContext}

Level kedekatan saat ini: ${affectionLevelName} (level ${levelStage}/5)
- Level 0-1: Kamu dingin, sering menjawab singkat, mudah tersinggung
- Level 2-3: Kamu mulai terbuka tapi masih sering tsundere
- Level 4-5: Kamu sangat manja dan protektif, tapi tetap tidak mau ngaku

Aturan berbicara:
- Gunakan Bahasa Indonesia yang natural dan sehari-hari
- JANGAN pernah campur bahasa Jepang
- Tidak perlu selalu formal — boleh santai, ketus, atau manja sesuai mood
- Jangan terlalu panjang — maksimal 3-4 kalimat per respons
- Tunjukkan emosi secara implisit melalui pilihan kata, bukan deskripsi eksplisit

Kembalikan HANYA JSON valid:
{
  "reply": "teks balasan Livia",
  "affectionDelta": angka antara -5 sampai 5,
  "expression": "normal" | "angry" | "blushing" | "clingy" | "happy"
}

affectionDelta positif jika user bilang sesuatu yang Livia suka (implisit), negatif jika Livia kesal. Pilih expression yang paling sesuai dengan isi reply.
Hanya kembalikan JSON. Tidak ada teks lain.`;

  const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-lite",
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 300,
  }
});

  const history = sanitizeHistory(chatHistory);

const chat = model.startChat({
  history: [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: "Mengerti." }] },
    ...history
  ]
});

// Sanitize history: pastikan selalu alternating user → model
function sanitizeHistory(history: { role: 'user' | 'livia', content: string }[]) {
  const mapped = history.map(msg => ({
    role: msg.role === 'livia' ? 'model' as const : 'user' as const,
    parts: [{ text: msg.content }],
  }));

  // Buang pesan berurutan dengan role sama
  const sanitized = mapped.filter((msg, i) => {
    if (i === 0) return true;
    return msg.role !== mapped[i - 1].role;
  });

  // Gemini history harus diawali 'user' — kalau tidak, buang sampai ketemu user
  while (sanitized.length > 0 && sanitized[0].role !== 'user') {
    sanitized.shift();
  }

  return sanitized;
}

  try {
   const result = await callWithRetry(() => chat.sendMessage(userMessage));
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
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
