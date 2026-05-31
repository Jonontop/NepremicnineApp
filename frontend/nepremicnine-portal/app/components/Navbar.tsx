"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import NavbarThemeToggle from './NavbarThemeToggle';

export default function Navbar() {
  const router = useRouter();
  const [language, setLanguage] = useState<'sl' | 'en'>('sl');
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'sl' | 'en' | null;
    if (savedLang) setLanguage(savedLang);
    setMounted(true);
  }, []);

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
      vikend: 'Vikendi',
      zemljisce: 'Zemljišča'
    },
    en: {
      home: 'Home',
      realestate: 'Real Estate',
      offers: 'Property Offers',
      newbuilds: 'New Builds',
      about: 'About Us',
      faq: 'FAQ',
      all: 'All Listings',
      stanovanje: 'Apartments',
      hisa: 'Houses',
      poslovni: 'Commercial Units',
      vikend: 'Weekend Houses',
      zemljisce: 'Lands'
    }
  };

  const t = translations[language];

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md bg-white/80 border-slate-200 dark:bg-[#0f172a]/80 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        

        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          <span>vesta<span className="text-amber-500">.si</span></span>
        </Link>

        {/* Navigacijske povezave v zahtevanem vrstnem redu */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">

         {/* 4. Domov */}
          <Link href="/" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
            {t.home}
          </Link>
          
          {/* 1. Nepremičnine */}
          <Link href="/search" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
            {t.realestate}
          </Link>

          {/* 2. Ponudba nepremičnin (Dropdown) */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 hover:text-amber-500 dark:hover:text-amber-400 transition-colors font-semibold text-sm cursor-pointer ${dropdownOpen ? 'text-amber-500' : ''}`}
            >
              {t.offers}
              <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute left-0 mt-3 w-56 rounded-xl shadow-xl border p-1.5 z-50 bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
                <button onClick={() => { router.push('/search'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-bold cursor-pointer">{t.all}</button>
                <button onClick={() => { router.push('/search?type=stanovanje'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-medium cursor-pointer">{t.stanovanje}</button>
                <button onClick={() => { router.push('/search?type=hisa'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-medium cursor-pointer">{t.hisa}</button>
                <button onClick={() => { router.push('/search?type=poslovni'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-medium cursor-pointer">{t.poslovni}</button>
                <button onClick={() => { router.push('/search?type=zemljisce'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-medium cursor-pointer">{t.zemljisce}</button>
                <button onClick={() => { router.push('/search?type=vikend'); setDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs rounded-lg hover:bg-amber-400/10 hover:text-amber-500 font-medium cursor-pointer">{t.vikend}</button>
              </div>
            )}
          </div>

          {/* 3. Novogradnje */}
          <Link href="/search?filter=novogradnje" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
            {t.newbuilds}
          </Link>

          

          {/* 5. O projektu */}
          <Link href="/#about" className="hover:text-amber-400 transition-colors">
            {t.about}
          </Link>

          {/* 6. FAQ */}
          <Link href="/#faq" className="hover:text-amber-400 transition-colors">
            {t.faq}
          </Link>
        </nav>

        {/* Desni del (Gumb za temo + preklop jezika v stilu prejšnjega akcijskega gumba) */}
        <div className="flex items-center gap-4">
          <NavbarThemeToggle />
          
          <button 
            onClick={toggleLanguage}
            className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            {mounted ? (language === 'sl' ? 'English' : 'Slovenščina') : 'English'}
          </button>

          {/* Mobilni Hamburger menu */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors border text-slate-700 border-slate-200 dark:text-slate-300 dark:border-slate-800 cursor-pointer"
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* MOBILNI NAVIGACIJSKI MENI */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 flex flex-col gap-3 font-semibold text-sm shadow-inner bg-white border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
          <Link href="/search" onClick={() => setMobileMenuOpen(false)} className="text-left py-1">{t.realestate}</Link>
          
          <div className="flex flex-col">
            <span className="text-left py-1 text-amber-500 font-semibold">{t.offers}</span>
            <div className="pl-4 flex flex-col gap-2 mt-1 mb-1 border-l-2 py-1 text-xs border-amber-500/30">
              <Link href="/search" onClick={() => setMobileMenuOpen(false)} className="text-left py-0.5">{t.all}</Link>
              <Link href="/search?type=stanovanje" onClick={() => setMobileMenuOpen(false)} className="text-left py-0.5">{t.stanovanje}</Link>
              <Link href="/search?type=hisa" onClick={() => setMobileMenuOpen(false)} className="text-left py-0.5">{t.hisa}</Link>
              <Link href="/search?type=poslovni" onClick={() => setMobileMenuOpen(false)} className="text-left py-0.5">{t.poslovni}</Link>
              <Link href="/search?type=zemljisce" onClick={() => setMobileMenuOpen(false)} className="text-left py-0.5">{t.zemljisce}</Link>
              <Link href="/search?type=vikend" onClick={() => setMobileMenuOpen(false)} className="text-left py-0.5">{t.vikend}</Link>
            </div>
          </div>

          <Link href="/search?filter=novogradnje" onClick={() => setMobileMenuOpen(false)} className="text-left py-1">{t.newbuilds}</Link>
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-left py-1">{t.home}</Link>
          <Link href="/#about" onClick={() => setMobileMenuOpen(false)} className="text-left py-1">{t.about}</Link>
          <Link href="/#faq" onClick={() => setMobileMenuOpen(false)} className="text-left py-1">{t.faq}</Link>
        </div>
      )}
    </header>
  );
}