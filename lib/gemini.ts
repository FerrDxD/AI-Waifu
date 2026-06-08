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

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

  const history = chatHistory.map(msg => ({
    role: msg.role === 'livia' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: "Mengerti." }] },
      ...history
    ]
  });

  try {
    const result = await chat.sendMessage(userMessage);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    
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
}
