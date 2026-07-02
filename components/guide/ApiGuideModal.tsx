'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Key, ExternalLink, Check, X, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import { showCustomAlert } from '@/lib/alert';

interface ApiGuideModalProps {
  showFloatingButton?: boolean;
  floatingButtonClassName?: string;
}

export default function ApiGuideModal({ showFloatingButton = false, floatingButtonClassName }: ApiGuideModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('custom_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }

    // Cek apakah user sudah pernah melihat panduan ini
    const hasSeenGuide = localStorage.getItem('seen_api_key_guide');
    if (!hasSeenGuide && !savedKey) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200); // Muncul otomatis setelah 1.2 detik saat pertama kali buka web
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSave = async () => {
    if (apiKey.trim()) {
      localStorage.setItem('custom_gemini_api_key', apiKey.trim());
      document.cookie = `custom_gemini_api_key=${encodeURIComponent(apiKey.trim())}; path=/; max-age=31536000; SameSite=Lax`;
      setIsSaved(true);
      localStorage.setItem('seen_api_key_guide', 'true');
      setIsOpen(false);
      await showCustomAlert('API Key berhasil disimpan! Livia akan memproses obrolanmu tanpa batas limit.', 'Sistem Gemini AI 🔑');
    } else {
      showCustomAlert('Silakan masukkan API Key yang valid terlebih dahulu.', 'Perhatian ⚠️');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('seen_api_key_guide', 'true');
    setIsOpen(false);
  };

  return (
    <>
      {/* Tombol Floating / Pemicu Manual */}
      {showFloatingButton && (
        <button
          onClick={() => setIsOpen(true)}
          className={floatingButtonClassName || "fixed top-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-2xl shadow-lg hover:shadow-orange-500/25 flex items-center gap-2 transition-all duration-300 pointer-events-auto group hover:scale-105 animate-bounce"}
        >
          <Sparkles className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Panduan API Key</span>
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
          <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-orange-100 shadow-[0_20px_70px_rgba(255,117,140,0.25)] overflow-hidden flex flex-col max-h-[90vh] text-[#5c4d47] font-sans">
            
            {/* Top Accent Gradient Header */}
            <div className="w-full bg-gradient-to-r from-[#ff758c] via-rose-400 to-amber-400 p-6 md:p-8 text-white relative shrink-0">
              <button 
                onClick={handleSkip}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
                title="Tutup"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                  <Key size={22} className="animate-pulse" />
                </div>
                <span className="text-xs font-mono font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">
                  PENTING // ANTI-LIMIT
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight drop-shadow-sm">
                Panduan Pasang API Key AI
              </h2>
              <p className="text-white/90 text-xs md:text-sm font-medium mt-1 max-w-lg leading-relaxed">
                Agar obrolan, telepon suara, dan kencan dengan Livia tidak error karena batas limit server gratisan (429/503), gunakan kuota API Google Gemini milikmu sendiri!
              </p>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-sm">
              
              {/* Langkah-langkah */}
              <div className="flex flex-col gap-4">
                <h3 className="font-display font-black text-base text-[#5c4d47] flex items-center gap-2">
                  <HelpCircle className="text-amber-500" size={18} />
                  Cara Mendapatkan API Key Gratis (1 Menit):
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100/80 flex flex-col gap-1.5">
                    <span className="font-bold text-xs text-orange-600 bg-orange-100 w-max px-2.5 py-0.5 rounded-md font-mono">
                      LANGKAH 1
                    </span>
                    <p className="text-xs text-[#5c4d47] font-medium leading-relaxed">
                      Buka situs resmi Google AI Studio menggunakan akun Google milikmu.
                    </p>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#ff758c] hover:underline"
                    >
                      <span>Buka Google AI Studio</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100/80 flex flex-col gap-1.5">
                    <span className="font-bold text-xs text-orange-600 bg-orange-100 w-max px-2.5 py-0.5 rounded-md font-mono">
                      LANGKAH 2
                    </span>
                    <p className="text-xs text-[#5c4d47] font-medium leading-relaxed">
                      Klik tombol biru <b>"Create API key"</b> (atau Get API Key) dan pilih project baru gratis.
                    </p>
                  </div>

                  <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100/80 flex flex-col gap-1.5">
                    <span className="font-bold text-xs text-orange-600 bg-orange-100 w-max px-2.5 py-0.5 rounded-md font-mono">
                      LANGKAH 3
                    </span>
                    <p className="text-xs text-[#5c4d47] font-medium leading-relaxed">
                      Salin (Copy) kode API Key yang muncul. Kodenya akan diawali dengan huruf <code className="bg-white px-1.5 py-0.5 rounded text-pink-600 font-mono font-bold">AIzaSy...</code>
                    </p>
                  </div>

                  <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100/80 flex flex-col gap-1.5">
                    <span className="font-bold text-xs text-orange-600 bg-orange-100 w-max px-2.5 py-0.5 rounded-md font-mono">
                      LANGKAH 4
                    </span>
                    <p className="text-xs text-[#5c4d47] font-medium leading-relaxed">
                      Tempel (Paste) kode API Key tersebut ke kolom di bawah ini dan klik Simpan!
                    </p>
                  </div>

                </div>
              </div>

              {/* Form Input */}
              <div className="bg-gradient-to-r from-orange-50/80 to-pink-50/50 p-5 rounded-3xl border border-orange-200/60 flex flex-col gap-3">
                <label className="font-bold text-xs uppercase tracking-wider text-[#5c4d47] flex items-center gap-2">
                  <Key size={14} className="text-[#ff758c]" />
                  Masukkan API Key Gemini Kamu Di Sini:
                </label>
                
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs md:text-sm text-[#5c4d47] placeholder-gray-400 focus:outline-none focus:border-[#ff758c] font-mono shadow-inner transition-all"
                  />
                  <button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-[#ff758c] to-rose-500 hover:from-[#e06277] hover:to-rose-600 text-white px-6 py-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-pink-500/20 transition-all shrink-0 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Simpan & Aktifkan</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                  <ShieldCheck size={14} className="text-green-500 shrink-0" />
                  <span>Aman & Privasi Terjamin: API Key disimpan eksklusif di browser-mu dan tidak disimpan di database server kami.</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                Kamu bisa mengubahnya kapan saja di menu <b>Setelan</b>.
              </span>
              <button
                onClick={handleSkip}
                className="ml-auto text-xs font-bold text-gray-500 hover:text-[#5c4d47] px-4 py-2 rounded-xl hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                Nanti Saja (Gunakan API Server)
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
