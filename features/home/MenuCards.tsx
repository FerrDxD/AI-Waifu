'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Kartu navigasi home (M5.1)
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
      className={`group flex items-center justify-center md:justify-end gap-2 md:gap-4 px-4 md:pl-8 md:pr-5 py-2.5 md:py-3.5 rounded-2xl md:rounded-l-full md:rounded-r-[2rem] transition-all duration-300 md:hover:pr-7 border-2 md:border-r-0 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 ${
        isSpecial
          ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] border-white shadow-[0_12px_28px_rgba(255,117,140,0.35)] hover:shadow-[0_16px_36px_rgba(255,117,140,0.45)]'
          : 'bg-white/92 backdrop-blur-2xl border-white/80 hover:bg-white hover:border-pink-200 shadow-[0_6px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_28px_rgba(255,117,140,0.12)]'
      }`}
    >
      <span
        className={`font-display font-black text-sm md:text-xl tracking-wider transition-colors drop-shadow-xs ${
          isSpecial ? 'text-white' : 'text-[#5c4d47] group-hover:text-[#ff758c]'
        }`}
      >
        {title}
      </span>
      <div
        className={`p-2 rounded-full shadow-inner transition-transform duration-300 group-hover:scale-110 hidden md:block shrink-0 ${
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
      className="group flex flex-col items-center justify-center gap-1.5 w-full aspect-square bg-white/90 backdrop-blur-xl border border-pink-100/80 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:bg-white hover:border-pink-300 hover:shadow-[0_8px_24px_rgba(255,117,140,0.18)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
    >
      <div className="text-pink-400 group-hover:text-[#ff758c] transition-colors transform group-hover:scale-110 duration-200">
        {icon}
      </div>
      <span className="font-display font-bold text-[11px] text-[#5c4d47] group-hover:text-[#ff758c] transition-colors leading-tight text-center px-1">
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
    <Link
      href={href}
      prefetch={true}
      className="flex flex-col items-center justify-center gap-1 w-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-xl"
    >
      <div
        className={`p-2 rounded-xl transition-all ${
          isActive
            ? 'bg-pink-100/90 text-[#ff758c] shadow-xs'
            : 'text-gray-400 hover:text-[#ff758c] active:bg-pink-50 active:scale-90'
        }`}
      >
        {icon}
      </div>
      <span
        className={`font-display text-[10px] font-bold transition-colors ${
          isActive ? 'text-[#ff758c]' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
