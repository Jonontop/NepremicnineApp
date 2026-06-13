"use client";

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faCodeBranch, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../LanguageContext';

const translations = {
  sl: {
    nav: 'Navigacija',
    home: 'Domov',
    search: 'Iskalnik nepremičnin',
    stats: 'Statistika trga',
    legal: 'Pravno',
    tos: 'Pogoji uporabe',
    privacy: 'Politika zasebnosti',
    system: 'Sistem',
    support: 'podpora@smartnepremicnine.si',
    copyright: (year: number) =>
      `© ${year} vesta.si Slovenija. Vse pravice pridržane. Podatki so informativne narave.`,
    tagline:
      'Inteligentni agregator in analitični sistem za spremljanje nepremičninskega trga v Sloveniji. Podatki so zajeti, očiščeni in osveženi 24/7.',
  },
  en: {
    nav: 'Navigation',
    home: 'Home',
    search: 'Property Search',
    stats: 'Market Statistics',
    legal: 'Legal',
    tos: 'Terms of Service',
    privacy: 'Privacy Policy',
    system: 'System',
    support: 'support@vesta.si',
    copyright: (year: number) =>
      `© ${year} vesta.si Slovenia. All rights reserved. Data is for informational purposes only.`,
    tagline:
      'Intelligent aggregator and analytics system for monitoring the Slovenian real-estate market. Data is collected, cleaned and refreshed 24/7.',
  },
};

export default function Footer() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <footer className="bg-slate-950 text-white/40 border-t border-white/5 pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-16 border-b border-white/10">
          
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
              <span>vesta<span className="text-amber-500">.si</span></span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
              {t.tagline}
            </p>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">{t.nav}</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link href="/" className="hover:text-amber-400 transition-colors">{t.home}</Link>
              <Link href="/search" className="hover:text-amber-400 transition-colors">{t.search}</Link>
              <Link href="/#stats" className="hover:text-amber-400 transition-colors">{t.stats}</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">{t.legal}</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link href="/tos" className="hover:text-amber-400 transition-colors">{t.tos}</Link>
              <Link href="/privacy" className="hover:text-amber-400 transition-colors">{t.privacy}</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">{t.system}</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <FontAwesomeIcon icon={faDatabase} className="text-blue-400 w-3.5 text-center fa-fw" /> 
                <span>Supabase DB</span>
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <FontAwesomeIcon icon={faCodeBranch} className="text-emerald-400 w-3.5 text-center fa-fw" /> 
                <span>Next.js App Router</span>
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <FontAwesomeIcon icon={faEnvelope} className="text-slate-400 w-3.5 text-center fa-fw" /> 
                <span>{t.support}</span>
              </li>
            </ul>
          </div>

        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 text-xs text-slate-500">
          <div className="text-center sm:text-left">
            {t.copyright(new Date().getFullYear())}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] tracking-wider text-slate-400 font-mono">
              v1.1.0
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
