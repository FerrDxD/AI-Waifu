'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share2, Link2, Check, Loader2 } from 'lucide-react';
import {
  renderShareCard,
  canvasToBlob,
  downloadBlob,
  shareCard,
  buildShareUrl,
  shareFileName,
  type ShareCardData,
} from '@/lib/share/share-card';

interface ShareCardPreviewProps {
  data: ShareCardData;
  /** Origin untuk link share (default window.location.origin). */
  origin?: string;
  className?: string;
}

/**
 * Komponen preview card (canvas) + tombol unduh/bagikan/salin link.
 * Tidak menyentuh chat page — dipakai oleh route /share dan komponen lain.
 */
export default function ShareCardPreview({ data, origin, className }: ShareCardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = buildShareUrl(origin ?? (typeof window !== 'undefined' ? window.location.origin : ''), data);

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      setRendering(true);
      setError(null);
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        await renderShareCard(canvas, data);
        const b = await canvasToBlob(canvas);
        if (!cancelled) setBlob(b);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setRendering(false);
      }
    }
    void draw();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleDownload = () => {
    if (!blob) return;
    downloadBlob(blob, shareFileName(data));
  };

  const handleShare = async () => {
    if (!blob || sharing) return;
    setSharing(true);
    try {
      const result = await shareCard(blob, shareFileName(data), shareUrl);
      if (result === 'copied') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={className}>
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-pink-100 bg-white">
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff758c]" />
          </div>
        )}
        {error && (
          <div className="p-6 text-sm text-red-500 text-center">{error}</div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ aspectRatio: '1080 / 1350' }}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!blob}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-pink-200 text-[#5c4d47] font-bold text-sm px-4 py-3 rounded-2xl hover:bg-pink-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Unduh gambar
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={!blob || sharing}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold text-sm px-4 py-3 rounded-2xl shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 size={16} />
          {sharing ? 'Membagikan…' : 'Bagikan'}
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center gap-2 bg-white border border-pink-200 text-[#5c4d47] font-bold text-sm px-4 py-3 rounded-2xl hover:bg-pink-50 transition-colors"
        >
          {copied ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} />}
          {copied ? 'Tersalin' : 'Salin link'}
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-3">
        Bagikan momenmu dengan Livia ke sosial media. Gambar otomatis diunduh
        kalau browser tidak mendukung Web Share API.
      </p>
    </div>
  );
}
