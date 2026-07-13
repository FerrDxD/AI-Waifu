'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed top-4 md:top-6 right-4 md:right-6 z-50 flex items-center bg-white/80 backdrop-blur-md border border-pink-100 rounded-full p-1 shadow-md hover:shadow-lg transition-all">
      <button
        onClick={() => setLanguage('id')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          language === 'id'
            ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-sm'
            : 'text-gray-500 hover:text-[#5c4d47]'
        }`}
      >
        ID
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          language === 'en'
            ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-sm'
            : 'text-gray-500 hover:text-[#5c4d47]'
        }`}
      >
        EN
      </button>
    </div>
  );
}
