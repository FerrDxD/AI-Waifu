'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  ArrowLeft,
  Download,
  FileText,
  Trash2,
  ShieldCheck,
  Brain,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { playSfx } from '@/lib/sfx';
import { showCustomAlert, showCustomConfirm } from '@/lib/alert';
import { useLanguage } from '@/lib/i18n/LanguageContext';

/**
 * Pusat Privasi (M4.4).
 *
 * Tiga hak user, semuanya nyata — bukan tombol "Coming soon":
 *   1. Unduh seluruh data (JSON atau Markdown).
 *   2. Hapus semua memori Livia (tanpa menghapus akun).
 *   3. Hapus akun beserta seluruh data (permanen).
 *
 * Kenapa halaman terpisah, bukan bagian dari Settings: aksi di sini destruktif
 * dan jarang dipakai. Menempatkannya jauh dari tombol sehari-hari mengurangi
 * risiko klik tidak sengaja, dan memberi ruang untuk menjelaskan konsekuensinya
 * dengan tenang.
 */

type MemoryCount = number | null;

const DELETE_PHRASE = 'HAPUS AKUN SAYA';

export default function PrivacyCenterPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const [memoryCount, setMemoryCount] = useState<MemoryCount>(null);
  const [exporting, setExporting] = useState<'json' | 'markdown' | null>(null);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleting, setDeleting] = useState(false);

  const copy =
    language === 'en'
      ? {
          title: 'Privacy Center',
          subtitle: 'Your data, your control. Nothing here is a placeholder.',
          back: 'Back to Settings',
          exportTitle: 'Download your data',
          exportBody:
            'A complete copy of everything we store: account, progress, chat history, memories, and activity. Your API key is never included.',
          exportJson: 'Download JSON',
          exportMd: 'Download Markdown',
          memoryTitle: 'What Livia remembers',
          memoryBody: 'Facts Livia has stored about you. Deleting them makes her forget immediately.',
          memoryLoading: 'Checking…',
          memoryCount: (n: number) => `${n} memories stored`,
          memoryNone: 'No memories stored yet',
          memoryClear: 'Forget everything',
          dangerTitle: 'Delete account',
          dangerBody:
            'This permanently deletes your account and every piece of related data: chats, memories, progress, garden, activity. There is no recovery window.',
          dangerOpen: 'Delete my account',
          dangerType: (phrase: string) => `Type ${phrase} to confirm`,
          dangerCancel: 'Cancel',
          dangerConfirm: 'Permanently delete',
          dangerDeleting: 'Deleting…',
          wrongPhrase: 'The phrase does not match.',
          done: 'Your account has been deleted. Goodbye.',
          clearDone: 'All memories deleted. Livia has forgotten them.',
          fail: 'Something went wrong. Please try again.',
          viewPolicy: 'Privacy Policy',
          viewTos: 'Terms of Service',
        }
      : {
          title: 'Pusat Privasi',
          subtitle: 'Datamu, kendalimu. Tidak ada tombol pajangan di sini.',
          back: 'Kembali ke Pengaturan',
          exportTitle: 'Unduh datamu',
          exportBody:
            'Salinan lengkap semua yang kami simpan: akun, progres, riwayat obrolan, memori, dan aktivitas. API key tidak pernah disertakan.',
          exportJson: 'Unduh JSON',
          exportMd: 'Unduh Markdown',
          memoryTitle: 'Apa yang Livia ingat',
          memoryBody: 'Fakta yang tersimpan tentang kamu. Menghapusnya membuat Livia langsung lupa.',
          memoryLoading: 'Memeriksa…',
          memoryCount: (n: number) => `${n} memori tersimpan`,
          memoryNone: 'Belum ada memori tersimpan',
          memoryClear: 'Lupakan semuanya',
          dangerTitle: 'Hapus akun',
          dangerBody:
            'Menghapus akun dan SELURUH data terkait secara permanen: obrolan, memori, progres, kebun, aktivitas. Tidak ada masa pemulihan.',
          dangerOpen: 'Hapus akun saya',
          dangerType: (phrase: string) => `Ketik ${phrase} untuk mengonfirmasi`,
          dangerCancel: 'Batal',
          dangerConfirm: 'Hapus permanen',
          dangerDeleting: 'Menghapus…',
          wrongPhrase: 'Frasa konfirmasi tidak cocok.',
          done: 'Akunmu sudah dihapus. Sampai jumpa.',
          clearDone: 'Semua memori dihapus. Livia sudah melupakannya.',
          fail: 'Terjadi kesalahan. Coba lagi ya.',
          viewPolicy: 'Kebijakan Privasi',
          viewTos: 'Ketentuan Layanan',
        };

  const loadMemoryCount = useCallback(async () => {
    try {
      const res = await fetch('/api/memory', { cache: 'no-store' });
      if (!res.ok) {
        setMemoryCount(0);
        return;
      }
      const data = (await res.json()) as { memories?: unknown[] };
      setMemoryCount(Array.isArray(data.memories) ? data.memories.length : 0);
    } catch {
      setMemoryCount(null);
    }
  }, []);

  useEffect(() => {
    void loadMemoryCount();
  }, [loadMemoryCount]);

  const handleExport = async (format: 'json' | 'markdown') => {
    setExporting(format);
    playSfx('click');

    try {
      const res = await fetch(`/api/user/export?format=${format}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('export failed');

      const blob = await res.blob();

      // Nama file diambil dari header server supaya timestamp-nya konsisten
      // dengan waktu data benar-benar dikumpulkan.
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `teman-kost-data.${format === 'markdown' ? 'md' : 'json'}`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      playSfx('chime');
    } catch {
      playSfx('error');
      showCustomAlert(copy.fail);
    } finally {
      setExporting(null);
    }
  };

  const handleClearMemory = async () => {
    const confirmed = await showCustomConfirm(
      language === 'en'
        ? 'Delete every memory Livia has about you? She will forget all of it.'
        : 'Hapus semua memori Livia tentang kamu? Dia akan melupakan semuanya.'
    );
    if (!confirmed) return;

    setClearingMemory(true);
    playSfx('click');

    try {
      const res = await fetch('/api/memory?all=1', { method: 'DELETE' });
      if (!res.ok) throw new Error('clear failed');

      playSfx('chime');
      showCustomAlert(copy.clearDone);
      await loadMemoryCount();
    } catch {
      playSfx('error');
      showCustomAlert(copy.fail);
    } finally {
      setClearingMemory(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deletePhrase.trim().toUpperCase() !== DELETE_PHRASE) {
      playSfx('error');
      showCustomAlert(copy.wrongPhrase);
      return;
    }

    setDeleting(true);
    playSfx('click');

    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: deletePhrase }),
      });

      if (!res.ok) throw new Error('delete failed');

      playSfx('chime');
      showCustomAlert(copy.done);

      // Akun sudah tidak ada — sesi JWT masih memegang ID lama, jadi keluar
      // dan kembali ke halaman depan.
      await signOut({ callbackUrl: '/' });
    } catch {
      playSfx('error');
      showCustomAlert(copy.fail);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-2xl mx-auto px-5 py-8 md:py-12 flex flex-col gap-6">
        <Link
          href="/settings"
          onClick={() => playSfx('click')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#ff758c] hover:underline w-fit"
        >
          <ArrowLeft size={14} /> {copy.back}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff758c] to-[#ff8c75] flex items-center justify-center shrink-0">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl md:text-2xl text-[#5c4d47] leading-tight">
              {copy.title}
            </h1>
            <p className="text-xs text-gray-400 font-medium">{copy.subtitle}</p>
          </div>
        </div>

        {/* --- Export --- */}
        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-3">
          <h2 className="font-display font-black text-base text-[#5c4d47] flex items-center gap-2">
            <Download className="text-blue-500 w-4 h-4" /> {copy.exportTitle}
          </h2>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{copy.exportBody}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => void handleExport('json')}
              disabled={exporting !== null}
              className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs p-3.5 rounded-2xl transition-all disabled:opacity-50"
            >
              {exporting === 'json' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {copy.exportJson}
            </button>
            <button
              onClick={() => void handleExport('markdown')}
              disabled={exporting !== null}
              className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs p-3.5 rounded-2xl transition-all disabled:opacity-50"
            >
              {exporting === 'markdown' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {copy.exportMd}
            </button>
          </div>
        </section>

        {/* --- Memory --- */}
        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-3">
          <h2 className="font-display font-black text-base text-[#5c4d47] flex items-center gap-2">
            <Brain className="text-pink-500 w-4 h-4" /> {copy.memoryTitle}
          </h2>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{copy.memoryBody}</p>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
            <span className="text-xs font-bold text-[#5c4d47]">
              {memoryCount === null
                ? copy.memoryLoading
                : memoryCount === 0
                  ? copy.memoryNone
                  : copy.memoryCount(memoryCount)}
            </span>

            <button
              onClick={() => void handleClearMemory()}
              disabled={clearingMemory || memoryCount === 0}
              className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {clearingMemory ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              {copy.memoryClear}
            </button>
          </div>
        </section>

        {/* --- Delete account --- */}
        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-red-100 flex flex-col gap-3">
          <h2 className="font-display font-black text-base text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {copy.dangerTitle}
          </h2>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{copy.dangerBody}</p>

          {deleteStep === 'idle' ? (
            <button
              onClick={() => { playSfx('click'); setDeleteStep('confirm'); }}
              className="mt-1 w-full sm:w-auto self-start flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-4 py-3 rounded-2xl transition-all"
            >
              <Trash2 size={14} /> {copy.dangerOpen}
            </button>
          ) : (
            <div className="flex flex-col gap-3 mt-1">
              <label className="text-[11px] font-bold text-red-600">
                {copy.dangerType(DELETE_PHRASE)}
              </label>
              <input
                type="text"
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                disabled={deleting}
                autoComplete="off"
                placeholder={DELETE_PHRASE}
                className="w-full bg-red-50/50 border-2 border-red-100 rounded-xl px-4 py-3 text-sm font-bold text-[#5c4d47] placeholder-gray-300 focus:outline-none focus:border-red-400 transition-colors"
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting || deletePhrase.trim().toUpperCase() !== DELETE_PHRASE}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? copy.dangerDeleting : copy.dangerConfirm}
                </button>
                <button
                  onClick={() => { playSfx('click'); setDeleteStep('idle'); setDeletePhrase(''); }}
                  disabled={deleting}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold text-xs px-4 py-3 rounded-2xl transition-all disabled:opacity-40"
                >
                  {copy.dangerCancel}
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-4 text-xs font-bold px-1">
          <Link href="/privacy-policy" className="text-[#ff758c] hover:underline">
            {copy.viewPolicy}
          </Link>
          <Link href="/tos" className="text-[#ff758c] hover:underline">
            {copy.viewTos}
          </Link>
        </div>
      </div>
    </div>
  );
}
