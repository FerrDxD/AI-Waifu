'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shirt,
  Sparkles,
  Compass,
  GraduationCap,
  Heart,
  Moon,
  Briefcase,
  Flower2,
  Lock,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { EN_LIVIA_DIALOGUES } from '@/lib/i18n/content';

interface OutfitMeta {
  id: string;
  name: string;
  category: string;
  desc: string;
  icon: React.ReactNode;
}

const ALL_OUTFITS: OutfitMeta[] = [
  {
    id: 'default',
    name: 'Baju Biasa',
    category: 'Sehari-hari',
    desc: 'Pakaian santai sehari-hari Livia di dalam kos.',
    icon: <Shirt size={22} />,
  },
  {
    id: 'outfit_casual',
    name: 'Baju Santai',
    category: 'Kamar Kos',
    desc: 'Pakaian ganti nyaman untuk maraton belajar di meja kos.',
    icon: <Sparkles size={22} />,
  },
  {
    id: 'trench_coat',
    name: 'Trench Coat',
    category: 'Luar Ruangan',
    desc: 'Hangat dan bergaya untuk cuaca dingin atau jalan sore.',
    icon: <Compass size={22} />,
  },
  {
    id: 'outfit_school',
    name: 'Seragam SMA',
    category: 'Akademik',
    desc: 'Seragam sekolah pelaut khas heroine visual novel.',
    icon: <GraduationCap size={22} />,
  },
  {
    id: 'outfit_yukata',
    name: 'Yukata Festival',
    category: 'Festival',
    desc: 'Yukata tradisional Jepang untuk menikmati malam festival.',
    icon: <Flower2 size={22} />,
  },
  {
    id: 'gaun_pengantin',
    name: 'Gaun Pengantin',
    category: 'Spesial',
    desc: 'Gaun putih suci untuk janji ikatan paling istimewa.',
    icon: <Heart size={22} />,
  },
  {
    id: 'piyama',
    name: 'Piyama Malam',
    category: 'Istirahat',
    desc: 'Baju tidur yang lembut dan nyaman untuk istirahat.',
    icon: <Moon size={22} />,
  },
  {
    id: 'office_lady',
    name: 'Office Lady',
    category: 'Profesional',
    desc: 'Kemeja kantor rapi elegan lengkap dengan kacamata.',
    icon: <Briefcase size={22} />,
  },
];

export default function WardrobePage() {
  const { dict, language } = useLanguage();
  const [activeOutfit, setActiveOutfit] = useState<string>('default');
  const [ownedOutfits, setOwnedOutfits] = useState<string[]>(['default']);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('Lemari pakaianku. Jangan lama-lama milihnya!');

  useEffect(() => {
    if (language === 'en') {
      setMessage(EN_LIVIA_DIALOGUES.wardrobe.greeting);
    } else {
      setMessage('Lemari pakaianku. Jangan lama-lama milihnya ya!');
    }
  }, [language]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    const swipeThreshold = 50;

    if (diff > swipeThreshold) {
      setIsMobileMenuOpen(true);
    } else if (diff < -swipeThreshold) {
      setIsMobileMenuOpen(false);
    }
    setTouchStart(null);
  };

  useEffect(() => {
    const fetchWardrobe = async () => {
      try {
        const res = await fetch('/api/outfit');
        if (res.ok) {
          const data = await res.json();
          setActiveOutfit(data.activeOutfit || 'default');
          const items = data.itemsBrought || [];
          const validOutfitIds = ALL_OUTFITS.map((o) => o.id);
          setOwnedOutfits([
            'default',
            ...items.filter((i: string) => validOutfitIds.includes(i) || i.startsWith('outfit_')),
          ]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWardrobe();
  }, []);

  const changeOutfit = async (outfitId: string) => {
    if (!ownedOutfits.includes(outfitId)) {
      setMessage('Kamu belum beliin aku pakaian itu di Toko Kos!');
      return;
    }

    try {
      const res = await fetch('/api/outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outfitId }),
      });

      if (res.ok) {
        setActiveOutfit(outfitId);
        if (outfitId === 'default') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.default : 'Baju biasa memang paling nyaman buat di kos.');
        } else if (outfitId === 'outfit_casual') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.outfit_casual : 'Baju ini nyaman banget lho buat nyantai berdua di kamar.');
        } else if (outfitId === 'trench_coat') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.trench_coat : 'Hangat... tapi pelukanmu pasti lebih hangat kan?');
        } else if (outfitId === 'outfit_school') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.outfit_school : 'P-pakaian ini... agak ketat di bagian dada. Jangan mikir macem-macem ya!');
        } else if (outfitId === 'outfit_yukata') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.outfit_yukata : 'Yukata ini bagus kan? B-bukan berarti aku dandan cuma buat kamu ya!');
        } else if (outfitId === 'gaun_pengantin') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.gaun_pengantin : 'A-aku jadi malu dilihatin terus... Aku kelihatan cantik kan jadi istrimu?');
        } else if (outfitId === 'piyama') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.piyama : 'Hoaam... Piyamanya lembut banget. Waktunya istirahat ya?');
        } else if (outfitId === 'office_lady') {
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.wardrobe.office_lady : 'Bagaimana laporannya hari ini? Hehe, aku cocok kan jadi atasanmu?');
        } else {
          setMessage(language === 'en' ? 'How do I look?' : 'Gimana penampilanku? Cocok kan buatku?');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <LoadingScreen text="Membuka Lemari Livia..." />;

  return (
    <div
      className="h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none selection:bg-[#ff758c]/25 selection:text-[#5c4d47]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Background & Ambient Wash ─────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-[30%_center] md:bg-center opacity-35 transition-all duration-1000 mix-blend-multiply pointer-events-none"
        style={{ backgroundImage: "url('/bg/wardrobe-bg.webp')" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-white/40 pointer-events-none"
      />

      {/* ── Center Sprite Stage (Full Screen) ───────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <LiviaSprite
          expression="normal"
          outfit={activeOutfit}
          variant="wardrobe"
          disableFloat={true}
          className="w-full h-full"
          imgClassName="object-cover object-[30%_center] md:object-center drop-shadow-[0_20px_45px_rgba(255,117,140,0.18)] transition-all duration-300"
        />
      </div>

      {/* ── Floating Header ─────────────────────────────────────────── */}
      <header className="absolute top-4 left-4 md:top-8 md:left-8 z-30 flex items-center gap-3 pointer-events-auto">
        <Link
          href="/home"
          className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 bg-white/90 backdrop-blur-xl rounded-full text-[#5c4d47] hover:text-white hover:bg-gradient-to-r hover:from-[#ff758c] hover:to-[#ff0844] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(255,117,140,0.3)] active:scale-95 border border-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          title="Kembali ke Kamar Kos"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="bg-white/90 backdrop-blur-xl px-4 py-2 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-white/80 flex items-center gap-2.5">
          <Shirt className="text-pink-600 w-4 h-4" />
          <h1 className="font-display font-black text-sm md:text-base text-[#5c4d47] uppercase tracking-wider">
            {dict?.pages?.wardrobe?.title || 'Lemari Pakaian'}
          </h1>
        </div>
      </header>

      {/* ── Main Viewport Content ───────────────────────────────────── */}
      <div className="flex-1 w-full flex flex-col md:flex-row pt-16 md:pt-20 z-10 relative h-full overflow-hidden">
        {/* Left Side: Signature VN Dialogue Box */}
        <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-end relative z-20 pointer-events-none pb-8 md:pb-12">
          {/* Signature VN Dialogue Box with Nameplate */}
          <div
            className={`relative pt-3 w-[90%] md:w-[85%] max-w-md pointer-events-auto transition-all duration-300 md:self-start md:ml-8 mt-auto ${
              isMobileMenuOpen
                ? 'opacity-0 md:opacity-100 scale-95 md:scale-100'
                : 'opacity-100 scale-100'
            }`}
          >
            {/* Raised Nameplate Pill */}
            <div className="absolute top-0 left-6 inline-flex items-center gap-2 rounded-full border border-white bg-gradient-to-r from-[#ff0844] to-[#ffb199] px-4 py-1 shadow-[0_4px_16px_rgba(255,117,140,0.35)] z-20">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="font-display text-xs font-black uppercase tracking-widest text-white">
                Livia
              </span>
            </div>

            {/* Dialogue Bubble */}
            <div className="relative bg-white/95 backdrop-blur-2xl p-5 md:p-6 rounded-[2rem] border border-pink-100/90 shadow-[0_12px_40px_rgba(255,117,140,0.14)]">
              <p className="font-sans font-medium text-sm md:text-base leading-relaxed text-[#5c4d47]">
                &ldquo;{message}&rdquo;
              </p>
              <div className="mt-2 flex items-center justify-end">
                <span className="text-pink-400 text-xs animate-pulse font-serif select-none">
                  ✧
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Swipe / Toggle Hint (Smooth Pulse, No Dated Bounce) */}
          <div
            className={`md:hidden mt-4 bg-white/90 text-[#5c4d47] border border-pink-100 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-mono font-bold shadow-md pointer-events-auto flex items-center gap-2 transition-opacity duration-300 ${
              isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            <button onClick={() => setIsMobileMenuOpen(true)}>
              Ketuk untuk buka lemari →
            </button>
          </div>
        </div>

        {/* Right Side: Angled Wardrobe Cards Drawer */}
        {/* Mobile Backdrop Scrim */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-xs z-20 md:hidden transition-opacity duration-300 ${
            isMobileMenuOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div
          className={`absolute right-0 top-0 w-[88%] sm:w-[65%] md:w-1/2 h-full md:relative flex flex-col pt-20 md:pt-24 pb-32 px-4 md:px-10 overflow-y-auto hide-scrollbar z-30 items-end transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-[120%] md:translate-x-0'
          }`}
        >
          {/* Collection Header Strip */}
          <div className="w-full max-w-[440px] mb-6 pl-4 self-center md:self-end">
            <div className="inline-flex items-center justify-between gap-4 bg-white/95 backdrop-blur-xl border border-pink-100 px-6 py-2.5 rounded-full shadow-[0_6px_24px_rgba(255,117,140,0.1)] -skew-x-8">
              <span className="font-display font-black text-base text-[#5c4d47] uppercase tracking-wider skew-x-8">
                Koleksi Pakaian
              </span>
              <span className="font-mono text-xs font-bold text-pink-600 bg-pink-50 border border-pink-100 px-2.5 py-0.5 rounded-full skew-x-8">
                {ownedOutfits.length} / {ALL_OUTFITS.length} Dimiliki
              </span>
            </div>
          </div>

          {/* Outfit Cards List */}
          <div className="flex flex-col gap-3.5 w-full max-w-[440px] self-center md:self-end">
            {ALL_OUTFITS.map((outfit) => {
              const isOwned = ownedOutfits.includes(outfit.id);
              const isActive = activeOutfit === outfit.id;

              return (
                <div
                  key={outfit.id}
                  onClick={() => isOwned && changeOutfit(outfit.id)}
                  className={`relative w-full h-[88px] md:h-[96px] transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'md:-translate-x-4 -translate-x-2 scale-[1.02] z-10'
                      : isOwned
                      ? 'hover:-translate-x-2 opacity-95 hover:opacity-100 z-0'
                      : 'opacity-50 grayscale cursor-not-allowed z-0'
                  }`}
                >
                  {/* Outer Slanted Container */}
                  <div
                    className={`absolute inset-0 -skew-x-8 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] border-white shadow-[0_10px_28px_rgba(255,117,140,0.4)]'
                        : isOwned
                        ? 'bg-white/92 backdrop-blur-xl border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-pink-200 hover:bg-white'
                        : 'bg-gray-100/90 border-gray-200/80 shadow-none'
                    }`}
                  >
                    {/* Active Decorative Highlight */}
                    {isActive && (
                      <div className="absolute top-0 left-0 w-24 h-full bg-white/20 skew-x-8 -ml-8 pointer-events-none" />
                    )}
                  </div>

                  {/* Inner Content (Skewed Back to Straight) */}
                  <div className="absolute inset-0 skew-x-8 flex items-center px-4 md:px-5">
                    {/* Icon Box */}
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-xs transition-colors duration-300 ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : isOwned
                          ? 'bg-pink-50 text-pink-600 border border-pink-100'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {outfit.icon}
                    </div>

                    {/* Text Details */}
                    <div className="ml-3.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <h2
                          className={`font-display font-black text-base md:text-lg truncate transition-colors duration-300 ${
                            isActive ? 'text-white' : 'text-[#5c4d47]'
                          }`}
                        >
                          {outfit.name}
                        </h2>
                        {!isOwned && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                      </div>
                      <p
                        className={`text-xs font-medium truncate mt-0.5 transition-colors duration-300 ${
                          isActive ? 'text-pink-100' : 'text-[#7a7268]'
                        }`}
                      >
                        {outfit.desc}
                      </p>
                    </div>

                    {/* Active Badge */}
                    {isActive ? (
                      <div className="shrink-0 ml-1">
                        <div className="bg-white text-pink-600 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-pink-100">
                          <CheckCircle2 size={13} className="text-pink-600" />
                          <span>AKTIF</span>
                        </div>
                      </div>
                    ) : (
                      isOwned && (
                        <div className="shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={18} className="text-pink-400" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
