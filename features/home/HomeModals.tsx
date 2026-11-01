'use client';

import Link from 'next/link';
import {
  X,
  MapPin,
  Utensils,
  Shirt,
  Gift,
  Briefcase,
  BookOpen,
  Package,
  Tv,
  Radio,
  Calendar,
  Settings,
  Camera,
  Heart,
  PhoneCall,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { TranslationDict } from '@/lib/i18n/dictionaries/id';
import { BottomMenuCard } from './MenuCards';

export function MoreMenusModal({
  onClose,
  showDate,
  hasRecipeBook,
  dict,
  language,
}: {
  onClose: () => void;
  showDate: boolean;
  hasRecipeBook: boolean;
  dict: TranslationDict;
  language: string;
}) {
  const nav = dict.nav;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Semua Menu Teman Kos"
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white/96 backdrop-blur-2xl w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] pt-3 px-6 pb-10 md:pb-8 shadow-[0_20px_60px_rgba(255,117,140,0.18)] border border-pink-100/90 flex flex-col animate-[slideUp_0.3s_ease-out] max-h-[85vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="w-12 h-1 bg-pink-200/80 rounded-full mx-auto mb-4 shrink-0" />

        <div className="flex justify-between items-center mb-5 shrink-0">
          <div className="flex items-center gap-2">
            <Heart size={20} className="fill-pink-500 text-pink-500" />
            <h2 className="text-2xl font-display font-black uppercase tracking-tight text-[#5c4d47]">
              {language === 'en' ? 'More Menus' : 'Menu Lainnya'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 text-pink-600 hover:text-white hover:bg-gradient-to-r hover:from-[#ff758c] hover:to-[#ff0844] bg-pink-50 border border-pink-100 rounded-full flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <X size={17} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-4 gap-3 py-1">
          <BottomMenuCard href="/call" icon={<PhoneCall size={22} />} title={language === 'en' ? 'Call' : 'Panggilan'} />
          <BottomMenuCard href="/schedule" icon={<Calendar size={22} />} title={nav.schedule || 'Jadwal'} />
          <BottomMenuCard href="/wardrobe" icon={<Shirt size={22} />} title={nav.wardrobe || 'Lemari'} />
          <BottomMenuCard href="/shop" icon={<Gift size={22} />} title={nav.shop || 'Toko'} />
          <BottomMenuCard href="/work" icon={<Briefcase size={22} />} title={nav.work || 'Kerja'} />
          <BottomMenuCard href="/story" icon={<BookOpen size={22} />} title={nav.story || 'Cerita'} />
          {showDate && (
            <BottomMenuCard href="/date" icon={<MapPin size={22} />} title={nav.date || 'Jalan'} />
          )}
          {hasRecipeBook && (
            <BottomMenuCard href="/kitchen" icon={<Utensils size={22} />} title={nav.kitchen || 'Dapur'} />
          )}
          <BottomMenuCard href="/inventory" icon={<Package size={22} />} title={nav.inventory || 'Tas'} />
          <BottomMenuCard href="/lounge" icon={<Tv size={22} />} title={nav.lounge || 'Santai'} />
          <BottomMenuCard href="/radio" icon={<Radio size={22} />} title={nav.radio || 'Lofi'} />
          <BottomMenuCard href="/album" icon={<Camera size={22} />} title={nav.album || 'Album'} />
          <BottomMenuCard href="/settings" icon={<Settings size={22} />} title={nav.settings || 'Setelan'} />
        </div>
      </div>
    </div>
  );
}

export function MiniEventModal({
  onClose,
  invitedPlace,
}: {
  onClose: () => void;
  invitedPlace?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajakan Jalan Livia"
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-md flex items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]"
    >
      <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(255,117,140,0.2)] border border-pink-100 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-pink-50 to-pink-100 rounded-[2rem] flex items-center justify-center mb-5 shadow-inner border border-pink-200/80">
          <MapPin size={34} className="text-[#ff758c]" />
        </div>

        <h2 className="text-3xl font-display font-black uppercase tracking-tight text-[#5c4d47] mb-2">
          Momen Spesial
        </h2>

        <p className="text-[#5c4d47]/80 mb-4 text-sm leading-relaxed">
          Kamu menghabiskan waktu menemani Livia berbelanja. Dia memakai kacamata hitam pemberianmu sepanjang jalan,
          menyembunyikan wajahnya yang merona.
        </p>

        <p className="text-pink-600 font-display font-bold mb-6 text-base italic">
          &ldquo;T-tempat ini lumayan seru juga...&rdquo;
        </p>

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            Tutup
          </button>
          <Link
            href={invitedPlace ? `/date?location=${encodeURIComponent(invitedPlace)}` : `/date`}
            className="flex-1 py-3 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 text-center"
          >
            Ayo Jalan!
          </Link>
        </div>
      </div>
    </div>
  );
}
