"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'sl' | 'en';

interface LanguageContextValue {
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'sl',
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>('sl');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved === 'en' || saved === 'sl') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Lang) => {
    setLanguageState(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
