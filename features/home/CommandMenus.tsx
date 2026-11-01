'use client';

import {
  MessageSquare,
  Clock,
  BookOpen,
  Briefcase,
  Gift,
  MapPin,
  Menu,
  Shirt,
  Package,
  Radio,
  Calendar,
  Settings,
  Camera,
  Tv,
  Utensils,
  Sprout,
  PhoneCall,
  X,
} from 'lucide-react';
import type { TranslationDict } from '@/lib/i18n/dictionaries/id';
import { SideMenuCard, BottomMenuCard } from './MenuCards';

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
    { href: '/album', icon: <Camera size={20} />, title: dict?.nav?.album || 'Album' },
    { href: '/settings', icon: <Settings size={20} />, title: dict?.nav?.settings || 'Setelan' },
  ];

  const mainMenus = [
    {
      href: '/chat',
      icon: <MessageSquare size={22} />,
      title: dict.nav.chat.toUpperCase(),
      show: true,
      isSpecial: true,
    },
    {
      href: '/call',
      icon: <PhoneCall size={22} />,
      title: (language === 'en' ? 'Voice Call' : 'Panggilan').toUpperCase(),
      show: true,
      isSpecial: false,
    },
    {
      href: '/pomodoro',
      icon: <Clock size={22} />,
      title: dict.nav.pomodoro.toUpperCase(),
      show: true,
      isSpecial: false,
    },
    {
      href: '/story',
      icon: <BookOpen size={22} />,
      title: dict.nav.story.toUpperCase(),
      show: true,
      isSpecial: false,
    },
    {
      href: '/date',
      icon: <MapPin size={22} />,
      title: dict.nav.date.toUpperCase(),
      show: showDate,
      isSpecial: true,
    },
    {
      href: '/kitchen',
      icon: <Utensils size={22} />,
      title: dict.nav.kitchen.toUpperCase(),
      show: hasRecipeBook,
      isSpecial: false,
    },
    {
      href: '/garden',
      icon: <Sprout size={22} />,
      title: dict.nav.garden.toUpperCase(),
      show: true,
      isSpecial: false,
    },
  ].filter((m) => m.show);

  return (
    <aside
      aria-label="Menu Aksi Cepat"
      className="hidden md:flex flex-col items-end w-[320px] absolute bottom-4 right-0 z-40 h-[640px] justify-end pointer-events-auto origin-bottom-right [@media(max-height:740px)]:scale-[0.85] [@media(max-height:600px)]:scale-[0.7]"
    >
      <div className="relative w-full h-full flex flex-col justify-end">
        {/* Drawer sub-menu (terbuka saat toggle ditekan) */}
        <div
          className="absolute bottom-[90px] right-2 grid grid-cols-2 gap-2.5 w-[180px]"
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          {subMenus.map((m, i) => {
            const row = 4 - Math.floor(i / 2);
            return (
              <div
                key={m.title}
                style={{
                  transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(120px) scale(0.8)',
                  opacity: isOpen ? 1 : 0,
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${
                    isOpen ? 200 + row * 40 : 0
                  }ms`,
                }}
              >
                <BottomMenuCard href={m.href} icon={m.icon} title={m.title} />
              </div>
            );
          })}
        </div>

        {/* Menu utama kamar */}
        <div
          className="absolute bottom-[90px] right-0 flex flex-col gap-2.5 w-full items-end"
          style={{ pointerEvents: isOpen ? 'none' : 'auto' }}
        >
          {mainMenus.map((m, index, arr) => (
            <div
              key={m.title}
              style={{
                transform: isOpen
                  ? `translateY(${(arr.length - index) * 50}px) scale(0.85)`
                  : 'translateY(0) scale(1)',
                opacity: isOpen ? 0 : 1,
                pointerEvents: isOpen ? 'none' : 'auto',
                transition: `all 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${
                  isOpen ? index * 40 : (arr.length - 1 - index) * 40 + 100
                }ms`,
              }}
            >
              <SideMenuCard href={m.href} icon={m.icon} title={m.title} isSpecial={m.isSpecial} />
            </div>
          ))}
        </div>

        {/* Tombol buka/tutup drawer menu lainnya */}
        <button
          type="button"
          onClick={onToggle}
          className="absolute bottom-0 right-0 flex items-center gap-3 px-5 py-3 rounded-full transition-all group w-[190px] md:w-[220px] justify-end hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(255,117,140,0.12)] hover:shadow-[0_12px_32px_rgba(255,117,140,0.22)] backdrop-blur-2xl bg-white/92 border border-white/80 hover:border-pink-200 text-[#5c4d47] z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <span className="font-display font-black text-xs md:text-sm uppercase tracking-widest relative z-10 transition-colors group-hover:text-[#ff758c]">
            {isOpen ? dict.common.back : language === 'en' ? 'More Menus' : 'Menu Lainnya'}
          </span>
          <div
            className={`p-2 rounded-full transition-all duration-300 relative z-10 flex-shrink-0 ${
              isOpen
                ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white rotate-90'
                : 'bg-pink-50 text-[#ff758c] group-hover:bg-[#ff758c] group-hover:text-white'
            }`}
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </div>
        </button>
      </div>
    </aside>
  );
}
