'use client';

import { MessageSquare, Clock, BookOpen, Briefcase, Gift, MapPin, Menu, Shirt, Package, Radio, Calendar, Settings, Camera, Tv, Utensils, Sprout } from 'lucide-react';
import type { TranslationDict } from '@/lib/i18n/dictionaries/id';
import { SideMenuCard, BottomMenuCard } from './MenuCards';

/**
 * Menu perintah desktop di sisi kanan home (M5.1).
 *
 * Animasi buka-tutup memakai transform per-item dengan delay berjenjang —
 * nilai transisi disalin verbatim, karena begitu diubah rasionya, drawer
 * sub-menu dan menu utama tidak lagi saling menunggu.
 */

export function CommandMenus({
  isOpen,
  onToggle,
  showDate,
  hasRecipeBook,
  dict,
  language,
}: {
  isOpen: boolean;
  onToggle: () => void;
  showDate: boolean;
  hasRecipeBook: boolean;
  dict: TranslationDict;
  language: string;
}) {
  const subMenus = [
    { href: '/wardrobe', icon: <Shirt size={20} />, title: dict?.nav?.wardrobe || 'Lemari' },
    { href: '/shop', icon: <Gift size={20} />, title: dict?.nav?.shop || 'Toko' },
    { href: '/work', icon: <Briefcase size={20} />, title: dict?.nav?.work || 'Kerja' },
    { href: '/inventory', icon: <Package size={20} />, title: dict?.nav?.inventory || 'Tas' },
    { href: '/lounge', icon: <Tv size={20} />, title: dict?.nav?.lounge || 'Santai' },
    { href: '/radio', icon: <Radio size={20} />, title: dict?.nav?.radio || 'Lofi' },
    { href: '/schedule', icon: <Calendar size={20} />, title: dict?.nav?.schedule || 'Jadwal' },
    { href: '/pomodoro', icon: <Clock size={20} />, title: dict?.nav?.pomodoro || 'Pomodoro' },
    { href: '/settings', icon: <Settings size={20} />, title: dict?.nav?.settings || 'Setelan' },
    { href: '/album', icon: <Camera size={20} />, title: dict?.nav?.album || 'Album' },
  ];

  const mainMenus = [
    { href: '/chat', icon: <MessageSquare size={24} />, title: dict.nav.chat.toUpperCase(), show: true, isSpecial: false },
    { href: '/story', icon: <BookOpen size={24} />, title: dict.nav.story.toUpperCase(), show: true, isSpecial: false },
    {
      href: '/date',
      icon: <MapPin size={24} />,
      title: dict.nav.date.toUpperCase(),
      show: showDate,
      isSpecial: true,
    },
    {
      href: '/kitchen',
      icon: <Utensils size={24} />,
      title: dict.nav.kitchen.toUpperCase(),
      show: hasRecipeBook,
      isSpecial: false,
    },
    { href: '/garden', icon: <Sprout size={24} />, title: dict.nav.garden.toUpperCase(), show: true, isSpecial: false },
  ].filter((m) => m.show);

  return (
    <div className="hidden md:flex flex-col items-end w-[300px] absolute bottom-2 right-0 z-40 h-[600px] justify-end pointer-events-auto origin-bottom-right [@media(max-height:700px)]:scale-[0.8] [@media(max-height:550px)]:scale-[0.6]">
      <div className="relative w-full h-full flex flex-col justify-end">
        {/* Drawer sub-menu */}
        <div
          className="absolute bottom-[110px] right-2 grid grid-cols-2 gap-2 w-[160px]"
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          {subMenus.map((m, i) => {
            const row = 4 - Math.floor(i / 2);
            return (
              <div
                key={m.title}
                style={{
                  transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(150px) scale(0.8)',
                  opacity: isOpen ? 1 : 0,
                  transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${isOpen ? 300 + row * 60 : 0}ms`,
                }}
              >
                <BottomMenuCard href={m.href} icon={m.icon} title={m.title} />
              </div>
            );
          })}
        </div>

        {/* Menu utama */}
        <div
          className="absolute bottom-[110px] right-0 flex flex-col gap-3 w-full items-end"
          style={{ pointerEvents: isOpen ? 'none' : 'auto' }}
        >
          {mainMenus.map((m, index, arr) => (
            <div
              key={m.title}
              style={{
                transform: isOpen ? `translateY(${(arr.length - index) * 60}px) scale(0.8)` : 'translateY(0) scale(1)',
                opacity: isOpen ? 0 : 1,
                pointerEvents: isOpen ? 'none' : 'auto',
                transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? index * 60 : (arr.length - 1 - index) * 60 + 200}ms`,
              }}
            >
              <SideMenuCard href={m.href} icon={m.icon} title={m.title} isSpecial={m.isSpecial} />
            </div>
          ))}
        </div>

        {/* Tombol buka/tutup */}
        <button
          onClick={onToggle}
          className="absolute bottom-0 right-0 flex items-center gap-3 px-5 py-3.5 rounded-[2rem] transition-all group w-[180px] md:w-[240px] justify-end hover:scale-[1.02] shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:shadow-[0_12px_32px_rgba(255,117,140,0.2)] backdrop-blur-2xl bg-white/90 border border-white/70 hover:border-pink-200 text-[#5c4d47] z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          <span className="font-display font-black text-sm tracking-widest relative z-10 transition-colors group-hover:text-[#ff758c]">
            {isOpen ? dict.common.back.toUpperCase() : (language === 'en' ? 'MORE' : 'LAINNYA')}
          </span>
          <div
            className={`p-2.5 rounded-xl transition-all duration-300 relative z-10 flex-shrink-0 ${
              isOpen ? 'bg-[#ff758c] text-white rotate-180' : 'bg-pink-50 text-[#ff758c] group-hover:bg-[#ff758c] group-hover:text-white'
            }`}
          >
            <Menu size={22} />
          </div>
        </button>
      </div>
    </div>
  );
}
