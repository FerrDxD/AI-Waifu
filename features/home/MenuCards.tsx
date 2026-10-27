'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Kartu navigasi home (M5.1) — dipindah verbatim dari bawah HomeClient.
 */

export function SideMenuCard({
  href,
  icon,
  title,
  isSpecial = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  isSpecial?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={`group flex items-center justify-center md:justify-end gap-2 md:gap-4 px-4 md:pl-10 md:pr-6 py-2 md:py-3.5 rounded-2xl md:rounded-l-full md:rounded-r-[2rem] transition-all duration-300 md:duration-500 md:hover:pr-8 border-2 md:border-r-0 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
        isSpecial
          ? 'bg-gradient-to-l from-[#ff758c] to-[#ff0844] md:from-[#ff758c]/90 md:to-white/90 backdrop-blur-2xl border-white hover:border-pink-300 shadow-md md:shadow-[0_15px_30px_rgba(255,117,140,0.3)]'
          : 'bg-white/90 md:bg-white/80 backdrop-blur-2xl border-white/50 hover:bg-white hover:border-pink-200 shadow-sm md:shadow-[0_10px_25px_rgba(0,0,0,0.05)]'
      }`}
    >
      <span
        className={`font-display font-black text-sm md:text-[27px] tracking-widest md:italic transition-colors drop-shadow-sm ${
          isSpecial ? 'text-white' : 'text-[#5c4d47] group-hover:text-[#ff758c]'
        }`}
      >
        {title}
      </span>
      <div
        className={`p-2 md:p-3 rounded-full shadow-inner transition-transform duration-300 md:duration-500 group-hover:rotate-12 group-hover:scale-110 hidden md:block ${
          isSpecial ? 'bg-white text-[#ff758c]' : 'bg-pink-50 text-[#ff758c]'
        }`}
      >
        {icon}
      </div>
    </Link>
  );
}

export function BottomMenuCard({
  href,
  icon,
  title,
}: {
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className="group flex flex-col items-center justify-center gap-1.5 w-full aspect-square md:w-18 md:h-18 bg-white/90 md:bg-white/80 backdrop-blur-xl border border-pink-100/80 rounded-[1.5rem] md:rounded-2xl shadow-sm md:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:bg-white hover:border-[#ff758c]/60 hover:shadow-[0_8px_24px_rgba(255,117,140,0.15)] md:hover:-translate-y-1 active:scale-95 transition-all duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
    >
      <div className="text-pink-300 group-hover:text-[#ff758c] transition-colors transform group-hover:scale-110 duration-200">
        {icon}
      </div>
      <span className="font-display font-bold text-[10px] md:text-xs text-gray-500 group-hover:text-[#ff758c] transition-colors leading-tight text-center px-1">
        {title}
      </span>
    </Link>
  );
}

export function MobileNavBtn({
  href,
  icon,
  label,
  isActive = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  isActive?: boolean;
}) {
  return (
    <Link href={href} prefetch={true} className="flex flex-col items-center justify-center gap-1 w-14 focus-visible:outline-none">
      <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-pink-100 text-[#ff758c] shadow-sm' : 'text-gray-400 hover:text-[#ff758c] active:bg-pink-50 active:scale-90'}`}>
        {icon}
      </div>
      <span className={`font-display text-[9px] font-bold transition-colors ${isActive ? 'text-[#ff758c]' : 'text-gray-400'}`}>
        {label}
      </span>
    </Link>
  );
}
