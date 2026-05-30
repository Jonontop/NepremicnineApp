"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('theme') : null;
      let raf = 0;
      if (stored === 'dark' || stored === 'light') {
        raf = requestAnimationFrame(() => setTheme(stored));
      } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        raf = requestAnimationFrame(() => setTheme('dark'));
      }

      const onScroll = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', onScroll);
      return () => {
        window.removeEventListener('scroll', onScroll);
        if (raf) cancelAnimationFrame(raf);
      };
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem('theme', theme); } catch { }
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-50 border-b transition-all duration-300 backdrop-blur-md ${isDark ? 'border-slate-800' : 'border-slate-200'} ${scrolled ? (isDark ? 'bg-[#0f172a]/95 shadow-md' : 'bg-white/95 shadow-md') : (isDark ? 'bg-[#0f172a]/80' : 'bg-white/80')}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div>
              <span className={`font-bold text-base tracking-tight block ${isDark ? 'text-white' : 'text-slate-900'}`}>vesta.si</span>
              <span className="text-amber-600 text-[10px] font-semibold uppercase tracking-widest block -mt-0.5">Slovenija</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
              <Link href="/#listings" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} text-sm font-semibold uppercase tracking-wider transition-colors`}>Vse nepremičnine</Link>
              <Link href="/#type-offers" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} text-sm font-semibold uppercase tracking-wider transition-colors`}>Statistika trga</Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              title={isDark ? 'Preklopi na svetlo temo' : 'Preklopi na temno temo'}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors border text-lg ${isDark ? 'text-amber-300 hover:bg-slate-800 border-slate-700' : 'text-slate-600 hover:bg-slate-100 border-slate-200'}`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors border ${isDark ? 'text-slate-300 hover:bg-slate-800 border-slate-700' : 'text-slate-700 hover:bg-slate-100 border-slate-200'}`}>
              ☰
            </button>
          </div>
        </nav>
      </div>

      {mobileMenuOpen && (
        <div className={`md:hidden border-t px-4 py-4 space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <a href="#listings" onClick={() => setMobileMenuOpen(false)} className={`${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'} block p-2.5 text-base rounded-xl`}>Vse nepremičnine</a>
          <a href="#type-offers" onClick={() => setMobileMenuOpen(false)} className={`${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'} block p-2.5 text-base rounded-xl`}>Statistika trga</a>
        </div>
      )}
    </header>
  );
}
