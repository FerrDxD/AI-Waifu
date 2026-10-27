'use client';

import Link from 'next/link';
import { X, MapPin, Utensils, Shirt, Gift, Briefcase, BookOpen, Package, Tv, Radio, Calendar, Settings, Camera } from 'lucide-react';
import type { TranslationDict } from '@/lib/i18n/dictionaries/id';
import { BottomMenuCard } from './MenuCards';

/**
 * Modal-menu home (M5.1): "Menu Lainnya" + modal momen spesial.
 * JSX dipindah verbatim dari HomeClient.
 */

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
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2rem] pt-3 px-6 pb-10 md:pb-8 shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-display font-black text-[#5c4d47]">
            {language === 'en' ? 'More Menus' : 'Menu Lainnya'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 text-gray-400 hover:text-white hover:bg-[#ff758c] bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <X size={17} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
          {hasRecipeBook && (
            <BottomMenuCard href="/kitchen" icon={<Utensils size={24} />} title={nav.kitchen || 'Dapur'} />
          )}
          <BottomMenuCard href="/wardrobe" icon={<Shirt size={24} />} title={nav.wardrobe || 'Lemari'} />
          <BottomMenuCard href="/shop" icon={<Gift size={24} />} title={nav.shop || 'Toko'} />
          <BottomMenuCard href="/work" icon={<Briefcase size={24} />} title={nav.work || 'Kerja'} />
          <BottomMenuCard href="/story" icon={<BookOpen size={24} />} title={nav.story || 'Cerita'} />
          {showDate && (
            <BottomMenuCard href="/date" icon={<MapPin size={24} />} title={nav.date || 'Jalan'} />
          )}
          <BottomMenuCard href="/inventory" icon={<Package size={24} />} title={nav.inventory || 'Tas'} />
          <BottomMenuCard href="/lounge" icon={<Tv size={24} />} title={nav.lounge || 'Santai'} />
          <BottomMenuCard href="/radio" icon={<Radio size={24} />} title={nav.radio || 'Lofi'} />
          <BottomMenuCard href="/schedule" icon={<Calendar size={24} />} title={nav.schedule || 'Jadwal'} />
          <BottomMenuCard href="/settings" icon={<Settings size={24} />} title={nav.settings || 'Setelan'} />
          <BottomMenuCard href="/album" icon={<Camera size={24} />} title={nav.album || 'Album'} />
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
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-pink-50 to-pink-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-pink-100">
          <MapPin size={38} className="text-[#ff758c]" />
        </div>
        <h2 className="text-3xl font-display font-black text-[#5c4d47] mb-3">Momen Spesial</h2>
        <p className="text-gray-500 mb-5 text-base leading-relaxed">
          Kamu menghabiskan waktu menemani Livia berbelanja. Dia memakai kacamata hitam pemberianmu sepanjang jalan,
          menyembunyikan wajahnya yang merona.
        </p>
        <p className="text-[#ff758c] font-display font-black mb-8 text-xl italic">&ldquo;T-tempat ini lumayan seru juga...&rdquo;</p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100 active:scale-[0.98] focus-visible:outline-none"
          >
            Tutup
          </button>
          <Link
            href={invitedPlace ? `/date?location=${encodeURIComponent(invitedPlace)}` : `/date`}
            className="flex-[2] py-3.5 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-black rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none"
          >
            <MapPin size={17} /> Jalan Lanjut!
          </Link>
        </div>
      </div>
    </div>
  );
}
