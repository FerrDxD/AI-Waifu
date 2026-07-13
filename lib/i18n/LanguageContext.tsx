'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { idDict, TranslationDict } from './dictionaries/id';
import { enDict } from './dictionaries/en';

type Language = 'id' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dict: TranslationDict;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'id',
  setLanguage: () => {},
  dict: idDict,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('id');

  useEffect(() => {
    // Read from localStorage on mount
    const saved = localStorage.getItem('teman_kost_lang') as Language;
    if (saved === 'en' || saved === 'id') {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('teman_kost_lang', lang);
    document.cookie = `teman_kost_lang=${lang}; path=/; max-age=31536000`;
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
  };

  const dict = language === 'en' ? enDict : idDict;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context || !context.dict) {
    return { language: 'id' as Language, setLanguage: () => {}, dict: idDict };
  }
  const safeDict: TranslationDict = {
    ...idDict,
    ...context.dict,
    common: { ...idDict.common, ...(context.dict.common || {}) },
    nav: { ...idDict.nav, ...(context.dict.nav || {}) },
    date: { ...idDict.date, ...(context.dict.date || {}) },
    settings: { ...idDict.settings, ...(context.dict.settings || {}) },
    pages: { ...idDict.pages, ...(context.dict.pages || {}) },
  };
  return { ...context, dict: safeDict };
}
