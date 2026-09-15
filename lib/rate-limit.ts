// Menggunakan In-Memory Map karena pendaftaran Upstash bermasalah.
// Di Vercel, ini mereset saat "cold start" (container mati), tapi sangat cukup untuk menangkal spam klik.
const limiters = new Map<string, { count: number, resetAt: number }>();

export const aiRateLimit = {
  limit: async (key: string) => {
    const now = Date.now();
    const record = limiters.get(key);
    
    if (!record || now > record.resetAt) {
      limiters.set(key, { count: 1, resetAt: now + 60000 }); // 1 menit window
      return { success: true };
    }
    
    if (record.count >= 5) return { success: false }; // Max 5 request per menit
    
    record.count++;
    return { success: true };
  }
};
