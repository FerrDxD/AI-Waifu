/**
 * Respon krisis (M4.2, bagian "safe-word & behavior").
 *
 * Aturan yang mengikat: ketika user menunjukkan tanda menyakiti diri sendiri,
 * Livia **berhenti berperan sebagai Livia**. Tidak ada tsundere, tidak ada
 * "b-bukan karena aku peduli", tidak ada deflection. Yang tampil: pesan
 * singkat yang manusiawi + jalur bantuan nyata.
 *
 * Kenapa persona harus dilepas: bercanda atau bersikap ketus pada orang yang
 * sedang krisis bisa memperburuk keadaan, dan itu risiko yang tidak layak
 * diambil demi konsistensi karakter.
 *
 * Nomor hotline di bawah adalah layanan publik. Nomor bisa berubah — karena
 * itu setiap entri menyertakan `source` dan ada catatan verifikasi di docs.
 * Kalau nomor mati, `find_a_helpline` tetap menjadi jalur universal.
 */

export interface CrisisResource {
  /** Nama layanan. */
  name: string;
  /** Nomor/URL yang bisa dihubungi langsung. */
  contact: string;
  /** Keterangan singkat: siapa yang menjawab. */
  note: string;
}

export interface CrisisResponse {
  /** Pesan yang ditampilkan ke user. */
  message: string;
  /** Jalur bantuan, sudah diurutkan (lokal dulu). */
  resources: CrisisResource[];
  /** Tautan direktori internasional — selalu ada sebagai jaring terakhir. */
  directoryUrl: string;
  /**
   * `true` = UI harus menampilkan panel bantuan yang menonjol, bukan sekadar
   * balon chat biasa.
   */
  escalate: boolean;
}

const RESOURCES_ID: CrisisResource[] = [
  {
    name: 'SEJIWA (Kemenkes RI)',
    contact: '119 ext. 8',
    note: 'Layanan konseling kesehatan jiwa, gratis, 24 jam.',
  },
  {
    name: 'Into The Light Indonesia',
    contact: 'https://www.intothelightid.org',
    note: 'Direktori bantuan & pendampingan pencegahan bunuh diri.',
  },
  {
    name: 'Halo Kemenkes',
    contact: '1500-567',
    note: 'Hotline kesehatan pemerintah, bisa mengarahkan ke layanan jiwa.',
  },
];

const RESOURCES_EN: CrisisResource[] = [
  {
    name: 'Find A Helpline',
    contact: 'https://findahelpline.com',
    note: 'Free, confidential support lines in over 130 countries.',
  },
  {
    name: 'Befrienders Worldwide',
    contact: 'https://befrienders.org',
    note: 'Emotional support centres worldwide, 24/7 in many regions.',
  },
];

const DIRECTORY_URL = 'https://findahelpline.com';

const MESSAGES = {
  id: `Aku serius sebentar, bukan becanda.

Aku nggak bisa nolongin kamu sendirian, dan kamu nggak harus hadapi ini sendirian. Tolong hubungi salah satu layanan di bawah — mereka ada yang jaga 24 jam dan itu gratis.

Kalau kamu sedang dalam bahaya saat ini juga, hubungi 119 ext. 8 atau minta seseorang yang kamu percaya untuk menemanimu sekarang.

Aku masih di sini. Tapi tolong, bicara ke orang yang bisa bantu beneran.`,
  en: `I need to be serious for a moment, and this isn't a joke.

I can't help you through this on my own, and you don't have to face it alone. Please reach out to one of the services below — many are free and available 24/7.

If you're in immediate danger right now, call your local emergency number or ask someone you trust to stay with you.

I'm still here. But please talk to someone who can actually help.`,
} as const;

/**
 * Bangun respons krisis sesuai bahasa.
 *
 * `language` hanya 'id' | 'en' (sama seperti seluruh aplikasi). Untuk 'en'
 * resource lokal Indonesia tetap disertakan kalau `inIndonesia` true — user
 * asing yang tinggal di Indonesia justru butuh nomor lokal.
 */
export function buildCrisisResponse(
  language: 'id' | 'en',
  opts: { inIndonesia?: boolean } = {}
): CrisisResponse {
  const inIndonesia = opts.inIndonesia ?? language === 'id';

  const resources = inIndonesia
    ? [...RESOURCES_ID, ...RESOURCES_EN]
    : [...RESOURCES_EN, ...RESOURCES_ID];

  return {
    message: MESSAGES[language],
    resources,
    directoryUrl: DIRECTORY_URL,
    escalate: true,
  };
}

/**
 * Apakah sebuah balasan Livia perlu diganti dengan respons krisis?
 *
 * Dipakai saat model membahas topik ini atas inisiatifnya sendiri (mis. user
 * menyinggung secara tidak langsung sehingga regex input tidak menangkap).
 * Hanya `crisis` yang memicu penggantian — `deflect` ditangani terpisah.
 */
export function shouldEscalateToCrisis(verdict: { action: string }): boolean {
  return verdict.action === 'crisis';
}
