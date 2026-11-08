"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

type Lang = 'sl' | 'en';

interface LanguageContextValue {
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'sl',
  setLanguage: () => {},
});

const STORAGE_KEY = 'lang';
const listeners = new Set<() => void>();

function readLanguage(): Lang {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'sl';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR/hydration uses the default language, then the stored choice is picked
  // up without a setState-in-effect cascade.
  const language = useSyncExternalStore(subscribe, readLanguage, () => 'sl' as Lang);

  const setLanguage = useCallback((lang: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    notify();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
