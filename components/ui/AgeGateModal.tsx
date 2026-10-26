'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink, LogOut } from 'lucide-react';
import { playSfx } from '@/lib/sfx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { signOut } from 'next-auth/react';

/**
 * Modal age gate untuk akun yang dibuat SEBELUM M4.1 (M4.1).
 *
 * Kenapa perlu modal terpisah kalau registrasi sudah meminta konfirmasi:
 * akun lama tidak punya `age_confirmed_at`. Tanpa modal ini, gate hanya
 * berlaku untuk user baru — dan gate yang bisa dilewati dengan mendaftar lebih
 * awal bukan gate.
 *
 * Sifatnya **memblokir**: tidak ada tombol tutup, tidak bisa di-ESC. Satu-
 * satunya jalan keluar adalah konfirmasi atau keluar akun. Itu disengaja —
 * modal yang bisa ditutup tanpa memilih tidak mengonfirmasi apa pun.
 */
export default function AgeGateModal() {
  const { language } = useLanguage();
  const [needsGate, setNeedsGate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/user/age-gate', { cache: 'no-store' });

      // 401 = belum login. Halaman ini hanya untuk user login; biarkan
      // redirect auth yang menangani.
      if (!res.ok) return;

      const data = (await res.json()) as { confirmed?: boolean; unknown?: boolean };

      // `unknown: true` = server tidak bisa memastikan (migrasi belum jalan).
      // Jangan blokir: user tidak punya cara menyelesaikan modal yang POST-nya
      // juga akan gagal.
      if (data.unknown === true) {
        setNeedsGate(false);
        return;
      }

      setNeedsGate(data.confirmed !== true);
    } catch {
      // Gagal memeriksa bukan alasan memblokir user dari aplikasi. Gate akan
      // dicoba lagi pada mount berikutnya.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    playSfx('click');

    try {
      const res = await fetch('/api/user/age-gate', { method: 'POST' });
      if (!res.ok) throw new Error('failed');

      playSfx('chime');
      setNeedsGate(false);
    } catch {
      playSfx('error');
      setError(
        language === 'en'
          ? 'Could not save your confirmation. Please try again.'
          : 'Gagal menyimpan konfirmasi. Coba lagi ya.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !needsGate) return null;

  const copy =
    language === 'en'
      ? {
          title: 'Before we start',
          body: 'Teman Kost is an AI companion app with romantic themes. It is intended for adults only.',
          confirm: "I'm 18 or older — continue",
          leave: 'Sign out',
          note: 'We only store the time you confirmed. We never ask for your date of birth.',
          terms: 'Terms of Service',
          privacy: 'Privacy Policy',
        }
      : {
          title: 'Sebelum mulai',
          body: 'Teman Kost adalah aplikasi pendamping AI dengan tema romantis. Aplikasi ini hanya untuk dewasa.',
          confirm: 'Saya 18 tahun atau lebih — lanjut',
          leave: 'Keluar akun',
          note: 'Kami hanya menyimpan waktu konfirmasimu. Tanggal lahir tidak pernah diminta.',
          terms: 'Ketentuan Layanan',
          privacy: 'Kebijakan Privasi',
        };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-orange-100 p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff758c] to-[#ff8c75] flex items-center justify-center shrink-0">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h2 className="font-display font-black text-xl text-[#5c4d47] leading-tight">{copy.title}</h2>
        </div>

        <p className="text-sm text-[#5c4d47] font-medium leading-relaxed">{copy.body}</p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-gray-400">
          <a href="/terms" target="_blank" className="hover:text-[#ff758c] inline-flex items-center gap-1">
            {copy.terms} <ExternalLink size={10} />
          </a>
          <a href="/privacy-policy" target="_blank" className="hover:text-[#ff758c] inline-flex items-center gap-1">
            {copy.privacy} <ExternalLink size={10} />
          </a>
        </div>

        {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-[#ff758c] to-[#ff8c75] hover:from-[#ff647e] hover:to-[#ff7a63] text-white font-display font-black text-sm rounded-2xl shadow-lg shadow-pink-500/25 transition-all transform active:scale-98 disabled:opacity-50"
          >
            {submitting ? '...' : copy.confirm}
          </button>

          <button
            onClick={() => { playSfx('click'); void signOut({ callbackUrl: '/' }); }}
            className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-[#ff758c] transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <LogOut size={12} /> {copy.leave}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 font-medium leading-relaxed border-t border-orange-50 pt-3">
          {copy.note}
        </p>
      </div>
    </div>
  );
}
