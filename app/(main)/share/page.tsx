'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import ShareCardPreview from '@/components/share/ShareCardPreview';
import { parseShareParams } from '@/lib/share/share-card';

function ShareContent() {
  const params = useSearchParams();
  const data = parseShareParams(params);

  const [userText, setUserText] = useState(data?.userText ?? '');
  const [liviaText, setLiviaText] = useState(data?.liviaText ?? '');
  const [userName, setUserName] = useState(data?.userName ?? '');
  const [submitted, setSubmitted] = useState(Boolean(data));

  const canRender = userText.trim().length > 0 && liviaText.trim().length > 0;

  if (!submitted || !canRender) {
    return (
      <main className="min-h-[100dvh] w-full bg-[#fff5f6] flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-[2rem] p-6 shadow-sm border border-pink-100 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Link href="/home" className="p-1.5 rounded-full hover:bg-pink-50 text-[#5c4d47]">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-display font-black text-xl text-[#5c4d47]">
              Bagikan momen chat
            </h1>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Tempel cuplikan obrolanmu dengan Livia, lalu buat card gambar untuk
            dibagikan ke sosial media.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#5c4d47]">Pesanmu</span>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              rows={3}
              placeholder="Misal: Livia, hari ini aku capek banget..."
              className="rounded-2xl border border-pink-100 bg-pink-50/40 px-4 py-3 text-sm text-[#5c4d47] focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#5c4d47]">Balasan Livia</span>
            <textarea
              value={liviaText}
              onChange={(e) => setLiviaText(e.target.value)}
              rows={4}
              placeholder="Misal: Aku di sini kok. Istirahat dulu ya, nanti aku buatin teh."
              className="rounded-2xl border border-pink-100 bg-pink-50/40 px-4 py-3 text-sm text-[#5c4d47] focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#5c4d47]">Nama (opsional)</span>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Kamu"
              className="rounded-2xl border border-pink-100 bg-pink-50/40 px-4 py-3 text-sm text-[#5c4d47] focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </label>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!canRender}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} />
            Buat card
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-[#fff5f6] px-4 py-6 sm:py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/home" className="p-1.5 rounded-full hover:bg-pink-50 text-[#5c4d47]">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-display font-black text-xl text-[#5c4d47]">
            Card momenmu
          </h1>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="ml-auto text-xs font-bold text-[#ff758c] hover:underline"
          >
            Edit teks
          </button>
        </div>
        <ShareCardPreview
          data={{
            userText: userText.trim(),
            liviaText: liviaText.trim(),
            userName: userName.trim() || undefined,
          }}
        />
      </div>
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] w-full bg-[#fff5f6] flex items-center justify-center">
          <span className="text-sm text-gray-400">Memuat…</span>
        </main>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
