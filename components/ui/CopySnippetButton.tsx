'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * M7.4: tombol salin sketsa skenario eval ke clipboard (halaman /feedback).
 *
 * Client component satu-satunya di halaman ini — kopinya butuh navigator.
 * `snippet` dihitung di server (fungsi murni `scenarioSnippet`), jadi di sini
 * hanya aksi klik + status visual "Tersalin!".
 */
export default function CopySnippetButton({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API bisa ditolak (context non-secure / permission).
      // Fallback: buka snippet di prompt? Tidak — owner tinggal salin manual
      // dari console. Sengaja tidak menambah UI cadangan (panel internal).
      console.warn('Gagal menyalin snippet ke clipboard.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-all ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
          : 'bg-white border-orange-200 text-[#5c4d47] hover:bg-orange-50 hover:border-orange-300'
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Tersalin!' : 'Salin skenario'}
    </button>
  );
}
