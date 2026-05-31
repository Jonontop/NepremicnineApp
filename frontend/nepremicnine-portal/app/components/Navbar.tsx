"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider'; // <── Uvoziva najin globalni provider teme

export default function Navbar() {
  const router = useRouter();
  
  // ── POPRAVEK: Namesto lokalnega useState vzameva globalno stanje in funkcijo
  const { theme, toggleTheme } = useTheme(); 
  
  const [language, setLanguage] = useState<'sl' | 'en'>('sl');
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sinhronizacija jezika ob naložitvi (temo sedaj v ozadju zanesljivo vodi ThemeProvider)
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'sl' | 'en' | null;
    if (savedLang) setLanguage(savedLang);

    setMounted(true);
  }, []);

  // Zapri dropdown ob kliku izven njega
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'sl' ? 'en' : 'sl';
    setLanguage(newLang);
    localStorage.setItem('lang', newLang);
    window.location.reload();
  };

  const translations = {
    sl: {
      home: 'Domov',
      realestate: 'Nepremičnine',
      offers: 'Ponudba nepremičnin',
      newbuilds: 'Novogradnje',
      about: 'O projektu',
      faq: 'FAQ',
      all: 'Vsi oglasi',
      stanovanje: 'Stanovanja',
      hisa: 'Hiše',
      poslovni: 'Poslovni prostori',
      vikend: 'Vikendi'
    },
    en: {
      home: 'Home',
      realestate: 'Real Estate',
      offers: 'Property Types',
      newbuilds: 'New Builds',
      about: 'About Us',
      faq: 'FAQ',
      all: 'All Listings',
      stanovanje: 'Apartments',
      hisa: 'Houses',
      poslovni: 'Commercial',
      vikend: 'Weekend Houses'
    }
  };

  const t = translations[language];
  const isDark = theme === 'dark'; // <── Ker se 'theme' spreminja globalno, isDark pravilno reagira povsod

  if (!mounted) return <div className="h-20 bg-[#0f172a] border-b border-slate-800" />;

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${isDark ? 'border-slate-800/80 bg-[#0f172a]/90' : 'border-slate-200/80 bg-white/90'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-20">
          
          {/* LOGOTIP (Levo) */}
          <div className="flex items-center gap-2.5 group shrink-0 cursor-pointer" onClick={() => router.push('/')}>
            <div>
              <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold text-lg tracking-tight block`}>vesta.si</span>
              <span className="text-amber-500 text-[10px] font-bold uppercase tracking-widest block -mt-1">Slovenija</span>
            </div>
          </div>

          {/* NAVIGACIJSKI LINKI (Sredina) */}
          <div className="hidden md:flex items-center gap-8 font-medium text-xs tracking-wider uppercase">
            <button onClick={() => router.push('/')} className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}>
              {t.home}
            </button>
            
            <button onClick={() => router.push('/search')} className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}>
              {t.realestate}
            </button>

            {/* DROPDOWN ZAVIHEK (Offers) */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-1 ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors uppercase`}
              >
                {t.offers} <span className="text-[10px]">{dropdownOpen ? '▲' : '▼'}</span>
              </button>
              
              {dropdownOpen && (
                <div className={`absolute left-0 mt-3 w-52 rounded-xl shadow-xl border p-2 animate-in fade-in slide-in-from-top-2 duration-150 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
                  <button onClick={() => { router.push('/search'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-bold">{t.all}</button>
                  <button onClick={() => { router.push('/search?type=stanovanje'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-semibold">{t.stanovanje}</button>
                  <button onClick={() => { router.push('/search?type=hisa'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-semibold">{t.hisa}</button>
                  <button onClick={() => { router.push('/search?type=poslovni'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-semibold">{t.poslovni}</button>
                  <button onClick={() => { router.push('/search?type=vikend'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-semibold">{t.vikend}</button>
                </div>
              )}
            </div>

            <button onClick={() => router.push('/search?filter=novogradnje')} className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}>
              {t.newbuilds}
            </button>
            <button onClick={() => router.push('/#about')} className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}>
              {t.about}
            </button>
            <button onClick={() => router.push('/#faq')} className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}>
              {t.faq}
            </button>
          </div>

          {/* SPREMINJANJE PARAMETROV (Desno) */}
          <div className="flex items-center gap-3">
            {/* Gumb za jezik */}
            <button 
              onClick={toggleLanguage}
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              {language === 'sl' ? '🇬🇧 EN' : '🇸🇮 SL'}
            </button>

            {/* Gumb za temo ── POPRAVEK: sedaj sproži globalni toggleTheme */}
            <button
              onClick={toggleTheme}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors border text-base ${isDark ? 'text-amber-400 bg-slate-900 border-slate-800 hover:bg-slate-800' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'}`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Mobilni Hamburger gumb */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className={`md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors border ${isDark ? 'text-slate-300 border-slate-800 bg-slate-900' : 'text-slate-700 border-slate-200 bg-white'}`}
            >
              ☰
            </button>
          </div>
        </nav>
      </div>

      {/* MOBILNI MENI */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t p-4 flex flex-col gap-4 font-semibold text-sm uppercase tracking-wide shadow-inner ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
          <button onClick={() => { router.push('/'); setMobileMenuOpen(false); }} className="text-left py-1">{t.home}</button>
          <button onClick={() => { router.push('/search'); setMobileMenuOpen(false); }} className="text-left py-1">{t.realestate}</button>
          <button onClick={() => { router.push('/search?filter=novogradnje'); setMobileMenuOpen(false); }} className="text-left py-1">{t.newbuilds}</button>
          <button onClick={() => { router.push('/#about'); setMobileMenuOpen(false); }} className="text-left py-1">{t.about}</button>
          <button onClick={() => { router.push('/#faq'); setMobileMenuOpen(false); }} className="text-left py-1">{t.faq}</button>
        </div>
      )}
    </header>
  );
}