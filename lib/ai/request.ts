import { getUserApiKey } from '@/lib/ai/keys';

/**
 * Helper request-level AI (M2.2).
 *
 * Dipindah dari `lib/gemini.ts` karena tidak spesifik Gemini: bahasa dan
 * penentuan API key adalah urusan permintaan, bukan urusan provider.
 * `lib/gemini.ts` tetap mengekspornya selama transisi supaya route tidak
 * berubah-ubah.
 */

/**
 * Ambil API key custom milik user (M0/H0.1).
 *
 * PENTING: key TIDAK lagi dibaca dari cookie maupun `localStorage`.
 * Keduanya bisa dibaca script apa pun di domain ini (XSS / dependency yang
 * disusupi), dan API key LLM = tagihan ke kartu kredit user.
 *
 * Prioritas:
 *  1. Key tersimpan milik user (terenkripsi di DB) — diambil lewat `userId`.
 *  2. Header `x-custom-api-key` (hanya untuk sesi tab, tidak persisten).
 *  3. `undefined` → pakai key server.
 */
export async function resolveApiKey(
  userId: string,
  req?: Request
): Promise<string | undefined> {
  const stored = await getUserApiKey(userId);
  if (stored) return stored;

  const headerKey = req?.headers.get('x-custom-api-key')?.trim();
  if (headerKey && headerKey.length >= 20 && headerKey.length <= 200) {
    return headerKey;
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
