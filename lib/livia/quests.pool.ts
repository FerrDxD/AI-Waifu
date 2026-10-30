/**
 * Katalog quest harian (M0 asal, M8.4 dipecah ke file murni).
 *
 * File ini TANPA localStorage & TANPA window — aman di-import server.
 * Client (`lib/livia/quests.ts`) & server (`lib/livia/quests.server.ts`)
 * memakai sumber definisi yang sama.
 */
export interface DailyQuest {
  id: string;
  text: string;
  category: 'fokus' | 'kesehatan' | 'interaksi' | 'kosan';
  targetAction: string;
  targetRoute: string;
  required: number;
}

export const QUEST_POOL: DailyQuest[] = [
  { id: 'q1', text: 'Kunjungi dan putar lagu di menu Radio Kos FM', category: 'kosan', targetAction: 'visit_radio', targetRoute: '/radio', required: 1 },
  { id: 'q2', text: 'Tengok Livia dan lihat penampilannya di Kamar Kos', category: 'interaksi', targetAction: 'visit_bedroom', targetRoute: '/bedroom', required: 1 },
  { id: 'q3', text: 'Periksa koleksi pakaian Livia di dalam Lemari', category: 'interaksi', targetAction: 'visit_wardrobe', targetRoute: '/wardrobe', required: 1 },
  { id: 'q4', text: 'Cek katalog barang atau belikan hadiah di Toko Kosan', category: 'kosan', targetAction: 'visit_shop', targetRoute: '/shop', required: 1 },
  { id: 'q5', text: 'Buka Tas / Inventory untuk melihat barang koleksimu', category: 'kosan', targetAction: 'visit_inventory', targetRoute: '/inventory', required: 1 },
  { id: 'q6', text: 'Baca kembali kenangan atau cerita di menu Cerita', category: 'interaksi', targetAction: 'visit_story', targetRoute: '/story', required: 1 },
  { id: 'q7', text: 'Mampir dan istirahatkan diri sejenak di Lounge TV Kosan', category: 'kosan', targetAction: 'visit_lounge', targetRoute: '/lounge', required: 1 },
  { id: 'q8', text: 'Buka fitur Telepon / Call untuk mengecek status panggilan', category: 'interaksi', targetAction: 'visit_call', targetRoute: '/call', required: 1 },
  { id: 'q9', text: 'Lihat koleksi foto kenanganmu bersama Livia di Album', category: 'interaksi', targetAction: 'visit_album', targetRoute: '/album', required: 1 },
  { id: 'q10', text: 'Buka menu Fokus (Pomodoro) untuk bersiap nugas/belajar', category: 'fokus', targetAction: 'visit_pomodoro', targetRoute: '/pomodoro', required: 1 },
  { id: 'q11', text: 'Sentuh atau ajak ngobrol Livia di Beranda (3 kali sentuhan)', category: 'interaksi', targetAction: 'touch_livia', targetRoute: '/home', required: 3 },
  { id: 'q12', text: 'Cek pengaturan atau sesuaikan volume suara di Setelan', category: 'kosan', targetAction: 'visit_settings', targetRoute: '/settings', required: 1 },
  { id: 'q13', text: 'Cek opsi destinasi kencan di menu Jalan / Date', category: 'interaksi', targetAction: 'visit_date', targetRoute: '/date', required: 1 },
  { id: 'q14', text: 'Periksa lowongan atau status kerjaan di menu Kerja', category: 'fokus', targetAction: 'visit_work', targetRoute: '/work', required: 1 },
  { id: 'q15', text: 'Cek persediaan makanan atau masak sesuatu di Dapur', category: 'kesehatan', targetAction: 'visit_kitchen', targetRoute: '/kitchen', required: 1 },
  { id: 'q16', text: 'Kunjungi kebun kosan atau siram tanaman di Kebun', category: 'kesehatan', targetAction: 'visit_garden', targetRoute: '/garden', required: 1 },
  { id: 'q17', text: 'Kembali dan sapa Livia di Beranda utama Kosan', category: 'interaksi', targetAction: 'visit_home', targetRoute: '/home', required: 1 },
  { id: 'q18', text: 'Berinteraksi dengan Livia di Beranda (5 kali sentuhan)', category: 'interaksi', targetAction: 'touch_livia', targetRoute: '/home', required: 5 },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyQuests(dateStr?: string): DailyQuest[] {
  const date = dateStr || getTodayDateString();
  const seed = hashString(date);
  const pool = [...QUEST_POOL];
  const selected: DailyQuest[] = [];
  let currentSeed = seed;

  while (selected.length < 9 && pool.length > 0) {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    const index = currentSeed % pool.length;
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
}
