/**
 * Data control: export & hapus akun (M4.4).
 *
 * Dua hak user yang diwajibkan GDPR/UU PDP dan sering diabaikan:
 *   1. **Export** — salinan lengkap data sendiri, dalam format terbaca.
 *   2. **Hapus** — benar-benar hilang, bukan "dinonaktifkan".
 *
 * Bagian murni ada di sini (daftar bagian, sanitasi, ukuran) supaya bisa
 * diuji tanpa DB. Pengambilan data ada di `lib/safety/data-control.server.ts`.
 *
 * Aturan penting soal API key: key user **TIDAK PERNAH** ikut export.
 * Alasannya bukan teknis tapi keamanan — file export biasanya disimpan di
 * folder Download, dikirim ke orang lain, atau diunggah ke layanan lain.
 * File yang berisi API key LLM = tagihan kartu kredit user berpindah tangan.
 * Yang diekspor hanya `hasKey` (boolean) supaya user tahu fitur itu aktif.
 */

export const EXPORT_SECTIONS = [
  'account',
  'profile',
  'story',
  'chats',
  'summaries',
  'memories',
  'screentime',
  'pomodoro',
  'garden',
  'apiKeyStatus',
] as const;

export type ExportSection = (typeof EXPORT_SECTIONS)[number];

/** Format export yang didukung. JSON untuk mesin, Markdown untuk dibaca. */
export const EXPORT_FORMATS = ['json', 'markdown'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function normalizeExportFormat(value: unknown): ExportFormat {
  return value === 'markdown' ? 'markdown' : 'json';
}

/**
 * Batas jumlah baris per bagian di export.
 *
 * Export tanpa batas bisa membunuh server untuk user dengan 100 ribu pesan.
 * Yang dipotong adalah yang PALING LAMA (riwayat terbaru lebih berguna), dan
 * jumlah yang dipotong dicatat jujur di output — bukan disembunyikan.
 */
export const EXPORT_LIMITS = {
  chats: 5_000,
  summaries: 500,
  memories: 500,
  screentime: 1_000,
  pomodoro: 1_000,
  garden: 100,
} as const;

/** Nama file export, selalu unik per waktu supaya tidak saling menimpa. */
export function exportFileName(format: ExportFormat, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `teman-kost-data-${stamp}.${format === 'markdown' ? 'md' : 'json'}`;
}

export interface ExportBundle {
  /** Versi skema export — supaya file lama bisa dikenali di masa depan. */
  schemaVersion: 1;
  exportedAt: string;
  /** Bagian yang berhasil diambil. Bagian gagal TIDAK menghilangkan sisanya. */
  sections: Partial<Record<ExportSection, unknown>>;
  /** Bagian yang gagal diambil beserta alasan singkatnya. */
  failures: Array<{ section: ExportSection; reason: string }>;
  /** Bagian yang dipotong karena batas. */
  truncated: Array<{ section: ExportSection; kept: number; dropped: number }>;
}

/**
 * Bangun bundel export dari data yang sudah diambil.
 *
 * Dipisah dari pengambilan supaya bentuk output (yang dijanjikan ke user)
 * bisa diuji tanpa DB.
 */
export function buildExportBundle(input: {
  sections: Partial<Record<ExportSection, unknown>>;
  failures?: Array<{ section: ExportSection; reason: string }>;
  truncated?: Array<{ section: ExportSection; kept: number; dropped: number }>;
  now?: Date;
}): ExportBundle {
  return {
    schemaVersion: 1,
    exportedAt: (input.now ?? new Date()).toISOString(),
    sections: input.sections,
    failures: input.failures ?? [],
    truncated: input.truncated ?? [],
  };
}

/**
 * Versi Markdown dari bundel export — untuk user yang ingin membaca, bukan
 * memproses. Isinya sama, hanya dipresentasikan berbeda.
 */
export function renderExportMarkdown(bundle: ExportBundle): string {
  const lines: string[] = [
    '# Data Kamu — Teman Kost',
    '',
    `Diekspor: ${bundle.exportedAt}`,
    `Versi skema: ${bundle.schemaVersion}`,
    '',
    'Dokumen ini berisi seluruh data yang kami simpan tentang kamu. API key',
    'sengaja TIDAK disertakan — hanya status aktif/tidaknya.',
    '',
  ];

  for (const [section, value] of Object.entries(bundle.sections)) {
    lines.push(`## ${section}`, '');

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push('_(kosong)_', '');
        continue;
      }
      for (const item of value) {
        lines.push(`- ${formatMarkdownValue(item)}`);
      }
      lines.push('');
    } else if (value && typeof value === 'object') {
      for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`- **${key}**: ${formatMarkdownValue(field)}`);
      }
      lines.push('');
    } else {
      lines.push(`${formatMarkdownValue(value)}`, '');
    }
  }

  if (bundle.truncated.length > 0) {
    lines.push('## Catatan pemotongan', '');
    for (const entry of bundle.truncated) {
      lines.push(
        `- \`${entry.section}\`: disimpan ${entry.kept} baris terbaru, ${entry.dropped} baris lama tidak disertakan.`
      );
    }
    lines.push('');
  }

  if (bundle.failures.length > 0) {
    lines.push('## Bagian yang gagal diambil', '');
    for (const entry of bundle.failures) {
      lines.push(`- \`${entry.section}\`: ${entry.reason}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatMarkdownValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.replace(/\n+/g, ' ').slice(0, 500);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => formatMarkdownValue(item)).join(', ');
  if (typeof value === 'object') return '`' + JSON.stringify(value).slice(0, 500) + '`';
  return String(value);
}

/**
 * Kalimat konfirmasi yang harus diketik user untuk menghapus akun.
 *
 * Bukan kapitalisasi: ini satu-satunya rem antara klik tidak sengaja dan
 * kehilangan permanen. Dipakai baik oleh UI maupun server (server memvalidasi
 * ulang, karena client tidak dipercaya).
 */
export const DELETE_ACCOUNT_PHRASE = 'HAPUS AKUN SAYA';

export function isDeleteConfirmationValid(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toUpperCase() === DELETE_ACCOUNT_PHRASE;
}
