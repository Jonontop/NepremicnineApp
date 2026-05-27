"use client";

import React, { useState, useEffect } from 'react';
import CountUp from 'react-countup';

// ── TYPES & INTERFACES ──────────────────────────────────────────────────────
interface Property {
  id: string;
  title: string;
  location: string;
  city: 'Ljubljana' | 'Maribor' | 'Koper' | 'Kranj' | 'Celje';
  price: number;
  area: number;
  rooms: number;
  year: number;
  image: string;
  badgeType: 'emerald' | 'slate' | 'amber' | 'indigo';
  badgeText: string;
  isPremium?: boolean;
  filterTag: 'novogradnje' | '24h' | 'premium' | 'rabljeno';
  type: 'stanovanje' | 'hisa' | 'poslovni' | 'vikend';
  weight: number; // Dodano polje za prioriteto oglasov
}

interface TypeStats {
  poslovni: number;
  zemljisca: number;
  hise: number;
  stanovanja: number;
}

interface ActionStats {
  [key: string]: { prodaja: number; oddaja: number };
}

export default function EstateMS() {
  // ── STATES ────────────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeAdsCount, setActiveAdsCount] = useState<number>(0);
  const [newbuildCount, setNewbuildCount] = useState<number>(0);
  const [regionsCount, setRegionsCount] = useState<number>(0);
  const [animateStats, setAnimateStats] = useState<boolean>(false);
  const [language, setLanguage] = useState<'sl' | 'en'>('sl');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [typeCounts, setTypeCounts] = useState<TypeStats>({
    poslovni: 0,
    zemljisca: 0,
    hise: 0,
    stanovanja: 0,
  });
  const [actionCounts, setActionCounts] = useState<ActionStats>({});

  // Iskalna stanja iz Hero iskalne kartice
  const [searchType, setSearchType] = useState<string>('stanovanje');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [searchMinPrice, setSearchMinPrice] = useState<string>('');
  const [searchMaxPrice, setSearchMaxPrice] = useState<string>('');
  const [selectedRooms, setSelectedRooms] = useState<number | null>(3);

  // Končni iskalni pogoji, ki se uveljavijo ob kliku na "Poišči"
  const [appliedFilters, setAppliedFilters] = useState({
    type: 'stanovanje',
    location: '',
    minPrice: '',
    maxPrice: '',
    rooms: 3 as number | null
  });

  // ── PRIDOBIVANJE PODATKOV IZ BAZE (NAČIN KOT V SEARCH/PAGE) ─────────────────
  useEffect(() => {
    const fetchTopProperties = async () => {
      try {
        setLoading(true);
        // Klic vašega API endpointa z parametri za sortiranje po teži in limitom 6
        // Opomba: Prilagodite url pot (/api/properties ali /api/search), če ima vaš backend drugačno strukturo
        const response = await fetch('/api/properties?limit=6&orderBy=weight_desc&view=home');
        if (!response.ok) {
          throw new Error('Napaka pri pridobivanju podatkov');
        }
        const data = await response.json();
        setProperties(data);
      } catch (error) {
        console.error("Ni bilo mogoče naložiti oglasov iz baze:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopProperties();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/properties?view=stats');
        if (!response.ok) {
          throw new Error('Napaka pri pridobivanju statistike');
        }
        const data = await response.json();
        setActiveAdsCount(Number(data.activeAdsCount) || 0);
        setNewbuildCount(Number(data.newbuildCount) || 0);
        setRegionsCount(Number(data.uniqueLocationsCount) || 0);
        setTypeCounts(data.typeCounts || { poslovni: 0, zemljisca: 0, hise: 0, stanovanja: 0 });
        setActionCounts(data.actionCounts || {});
      } catch (error) {
        console.error("Ni bilo mogoče naložiti statistike:", error);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateStats(true), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const resolveTheme = (): 'light' | 'dark' => {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const timer = window.setTimeout(() => {
      setTheme(resolveTheme());
    }, 0);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => {
      const storedTheme = window.localStorage.getItem('theme');
      if (!storedTheme) setTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onMediaChange);

    return () => {
      window.clearTimeout(timer);
      media.removeEventListener('change', onMediaChange);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  // ── SCROLL DETECT EFFECT ──────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── TOGGLE FAVORITES ──────────────────────────────────────────────────────
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    );
  };

  // ── HANDLE SEARCH SUBMIT ──────────────────────────────────────────────────
  const handleSearch = () => {
    setAppliedFilters({
      type: searchType,
      location: searchLocation,
      minPrice: searchMinPrice,
      maxPrice: searchMaxPrice,
      rooms: selectedRooms
    });
    // Skočimo neposredno do mreže z oglasi
    const listingsElem = document.getElementById('listings');
    if (listingsElem) {
      listingsElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ── FILTER LOGIC (Glede na iskalnik v hero sekciji) ───────────────────────
  const filteredProperties = properties.filter((prop) => {
    if (appliedFilters.type && prop.type !== appliedFilters.type) return false;
    if (appliedFilters.location && prop.city !== appliedFilters.location) return false;
    if (appliedFilters.minPrice && prop.price < Number(appliedFilters.minPrice)) return false;
    if (appliedFilters.maxPrice && prop.price > Number(appliedFilters.maxPrice)) return false;
    if (appliedFilters.rooms !== null) {
      if (appliedFilters.rooms === 5 ? prop.rooms < 5 : prop.rooms !== appliedFilters.rooms) return false;
    }
    return true;
  });

  // Pomožna funkcija za značke barv
  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'emerald': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'amber': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'indigo': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const dictionary = {
    sl: {
      listings: 'Vse nepremičnine',
      market: 'Statistika trga',
      search: 'Poišči nepremičnine',
      favorites: 'Priljubljene',
      intro: 'Sistem v realnem času spremlja',
      active: 'aktivnih oglasov',
      updated: 'posodobljeno pred 5 minutami',
      titleTop: 'Poiščite ponudbo glede na vrsto nepremičnine',
      details: 'Podrobnosti',
    },
    en: {
      listings: 'All listings',
      market: 'Market stats',
      search: 'Search properties',
      favorites: 'Favorites',
      intro: 'Live system tracks',
      active: 'active listings',
      updated: 'updated 5 minutes ago',
      titleTop: 'Browse listings by property type',
      details: 'Details',
    },
  } as const;
  const t = dictionary[language];
  const isDark = theme === 'dark';

  return (
    <div className={`${isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-100 text-slate-900'} min-h-screen selection:bg-amber-300 selection:text-slate-900`}>
      
      {/* ── ALERT BAR ── */}
      <div className={`${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} border-b py-3 px-4`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] animate-pulse" />
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium`}>
              {t.intro}{' '}
              <span className="text-amber-600 font-bold">
                {animateStats ? <CountUp end={activeAdsCount} duration={1.2} separator="." /> : 0}
              </span>{' '}
              {t.active} &mdash;{' '}
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.updated}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className={`${isDark ? 'text-slate-300' : 'text-slate-500'} text-xs`}>Theme</label>
            <button
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className={`${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-700'} text-sm border rounded-lg px-3 py-1.5`}
            >
              {isDark ? 'Dark' : 'Light'}
            </button>
            <label className="text-xs text-slate-500">Lang</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'sl' | 'en')}
              className="text-sm bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700"
            >
              <option value="sl">Slovenščina</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── NAVBAR ── */}
      <header className={`sticky top-0 z-50 border-b transition-all duration-300 backdrop-blur-md ${isDark ? 'border-slate-800' : 'border-slate-200'} ${scrolled ? (isDark ? 'bg-[#0f172a]/95 shadow-md' : 'bg-white/95 shadow-md') : (isDark ? 'bg-[#0f172a]/80' : 'bg-white/80')}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <a href="#" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/10">
                <svg className="w-4 h-4 text-slate-950" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h3a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h3a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
              </div>
              <div>
                <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold text-base tracking-tight block`}>vesta.si</span>
                <span className="text-amber-600 text-[10px] font-semibold uppercase tracking-widest block -mt-0.5">Slovenija</span>
              </div>
            </a>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#listings" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} text-sm font-semibold uppercase tracking-wider transition-colors`}>{t.listings}</a>
              <a href="#type-offers" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} text-sm font-semibold uppercase tracking-wider transition-colors`}>{t.market}</a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <div className={`hidden sm:flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border ${isDark ? 'text-slate-100 bg-slate-800 border-slate-700' : 'text-slate-700 bg-slate-100 border-slate-200'}`}>
                <span>❤️ {t.favorites}: <strong className="text-amber-600">{favorites.length}</strong></span>
              </div>
              {/* Mobile Menu Trigger */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors border ${isDark ? 'text-slate-300 hover:bg-slate-800 border-slate-700' : 'text-slate-700 hover:bg-slate-100 border-slate-200'}`}>
                ☰
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} md:hidden border-t px-4 py-4 space-y-2`}>
            <a href="#listings" onClick={() => setMobileMenuOpen(false)} className={`${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'} block p-2.5 text-base rounded-xl`}>{t.listings}</a>
            <a href="#type-offers" onClick={() => setMobileMenuOpen(false)} className={`${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'} block p-2.5 text-base rounded-xl`}>{t.market}</a>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ── */}
      <section className={`relative overflow-hidden py-20 lg:py-28 px-4 sm:px-6 border-b ${isDark ? 'border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#111827]' : 'border-slate-200 bg-gradient-to-b from-white to-slate-100'}`}>
        
        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-[1px] bg-amber-400" />
              <span className="text-amber-600 text-xs uppercase font-bold tracking-widest">Premium nepremičninski portal</span>
            </div>
            <h1 className={`${isDark ? 'text-white' : 'text-slate-900'} text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.12] mb-6`}>
              Odkrijte bivalne<br />
              <em className="text-amber-600 not-italic font-semibold">prostore</em><br />
              z značajem.
            </h1>
            <p className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-base leading-relaxed max-w-md mb-8`}>
              Najcelovitejša zbirka nepremičnin v Sloveniji. Resnični podatki trga, verifikacija oglaševalcev in inteligentno iskanje na enem mestu.
            </p>
            
            {/* Micro Stats */}
            <div className={`flex gap-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} pt-6 max-w-sm`}>
              <div>
                <div className={`${isDark ? 'text-white' : 'text-slate-900'} text-2xl font-bold`}>
                  {animateStats ? <CountUp end={activeAdsCount} duration={1.3} separator="." /> : 0}
                </div>
                <div className="text-slate-500 text-[11px] uppercase font-bold tracking-wider mt-0.5">Aktivnih oglasov</div>
              </div>
              <div className={`w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              <div>
                <div className={`${isDark ? 'text-white' : 'text-slate-900'} text-2xl font-bold`}>
                  {animateStats ? <CountUp end={newbuildCount} duration={1.3} separator="." /> : 0}
                </div>
                <div className="text-slate-500 text-[11px] uppercase font-bold tracking-wider mt-0.5">Novogradnje</div>
              </div>
              <div className={`w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              <div>
                <div className={`${isDark ? 'text-white' : 'text-slate-900'} text-2xl font-bold`}>
                  {animateStats ? <CountUp end={regionsCount} duration={1.3} separator="." /> : 0} mest
                </div>
                <div className="text-slate-500 text-[11px] uppercase font-bold tracking-wider mt-0.5">Regij</div>
              </div>
            </div>
          </div>

          {/* Hero Right: Iskalna kartica */}
          <div className={`lg:col-span-7 p-7 sm:p-9 rounded-2xl shadow-xl ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
            
            <div className="flex gap-2 border-b border-slate-200 pb-4 mb-6 overflow-x-auto">
              {[
                { id: 'stanovanje', label: 'Stanovanje' },
                { id: 'hisa', label: 'Hiša' },
                { id: 'poslovni', label: 'Poslovni prostor' },
                { id: 'vikend', label: 'Vikend' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSearchType(t.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all border whitespace-nowrap ${searchType === t.id ? 'border-amber-300 bg-amber-50 text-amber-700 shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {/* Lokacija */}
              <div>
                <label className="block text-slate-500 text-[11px] uppercase font-bold tracking-wider mb-2">Lokacija nepremičnine</label>
                <select 
                  value={searchLocation} 
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-amber-400 appearance-none cursor-pointer"
                >
                  <option value="">Vsa Slovenija</option>
                  <option value="Ljubljana">Ljubljana</option>
                  <option value="Maribor">Maribor</option>
                  <option value="Koper">Koper</option>
                  <option value="Kranj">Kranj</option>
                  <option value="Celje">Celje</option>
                </select>
              </div>

              {/* Število sob */}
              <div>
                <label className="block text-slate-500 text-[11px] uppercase font-bold tracking-wider mb-2">Število sob</label>
                <div className="flex gap-1.5 justify-between bg-slate-50 border border-slate-300 p-1 rounded-xl">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedRooms(num)}
                      className={`flex-1 text-center py-2.5 text-sm font-bold rounded-lg transition-all ${selectedRooms === num ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {num === 5 ? '5+' : num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cenovni Razred */}
            <div className="mb-6">
              <label className="block text-slate-500 text-[11px] uppercase font-bold tracking-wider mb-2">Cenovni okvir (€)</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="number" 
                  placeholder="Minimalna cena (€)" 
                  value={searchMinPrice}
                  onChange={(e) => setSearchMinPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                />
                <input 
                  type="number" 
                  placeholder="Maksimalna cena (€)" 
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button 
              onClick={handleSearch}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider py-4 rounded-xl text-sm transition-all shadow-lg shadow-amber-400/10 active:scale-[0.99]"
            >
              {t.search}
            </button>
          </div>

        </div>
      </section>

      <section id="type-offers" className={`max-w-7xl mx-auto px-4 sm:px-6 py-16 rounded-2xl ${isDark ? 'bg-slate-900/40' : 'bg-slate-200/50'}`}>
        <h2 className={`text-4xl font-bold mb-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.titleTop}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: 'poslovni', label: 'Poslovni prostori', img: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80' },
            { key: 'zemljisca', label: 'Zemljišča', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' },
            { key: 'hise', label: 'Hiše', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80' },
            { key: 'stanovanja', label: 'Stanovanja', img: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=800&q=80' },
          ].map((item) => (
            <div key={item.key} className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl border p-4 shadow-sm transition-transform duration-300 hover:scale-[1.04] hover:shadow-xl`}>
              <div className={`${isDark ? 'text-slate-100' : 'text-slate-800'} text-xl font-semibold mb-3`}>{item.label}</div>
              <div className="relative h-44 rounded-xl overflow-hidden mb-3">
                <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white text-5xl font-bold">
                  {animateStats ? <CountUp end={typeCounts[item.key as keyof TypeStats]} duration={1.3} separator="." /> : 0}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-slate-100 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-rose-500">
                  Prodaja {actionCounts[item.key]?.prodaja ?? 0}
                </button>
                <button className="bg-slate-100 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-rose-500">
                  Oddaja {actionCounts[item.key]?.oddaja ?? 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROPERTY GRID ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16" id="listings">
        {loading ? (
          /* Stanje med nalaganjem podatkov iz baze */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
              Pridobivanje top ponudbe iz baze podatkov...
            </p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-white">
            <p className="text-slate-500 text-base font-medium mb-2">Ni zadetkov za izbrane iskalne pogoje.</p>
            <button 
              onClick={() => {
                setAppliedFilters({ type: 'stanovanje', location: '', minPrice: '', maxPrice: '', rooms: null });
                setSearchLocation(''); setSearchMinPrice(''); setSearchMaxPrice(''); setSelectedRooms(null);
              }}
              className="text-sm text-amber-600 underline"
            >
              Ponastavi iskalnik
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map((property) => {
              const isLiked = favorites.includes(property.id);
              const isHighWeightPremium = property.weight >= 80 || property.isPremium;

              return (
                <div
                  key={property.id}
                  className={`bg-[#0b1838] rounded-3xl overflow-hidden border transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl ${isHighWeightPremium ? 'border-amber-300/40 shadow-[0_8px_35px_rgba(245,158,11,0.08)]' : 'border-slate-800/40'}`}
                >
                  {/* Slika */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Priljubljeno gumb */}
                    <button
                      onClick={(e) => toggleFavorite(property.id, e)}
                      className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md w-10 h-10 rounded-2xl flex items-center justify-center text-base shadow border border-white/10 transition-transform hover:scale-110"
                    >
                      {isLiked ? '❤️' : '♡'}
                    </button>
                    {/* Značka */}
                    <div className="absolute bottom-3 left-3">
                      <span className={`text-[11px] font-bold tracking-wider uppercase border rounded-md px-2.5 py-1 shadow-md backdrop-blur-md ${getBadgeClass(property.badgeType)}`}>
                        {property.filterTag === 'novogradnje' ? 'Novogradnja' : property.badgeText}
                      </span>
                    </div>
                  </div>

                  {/* Vsebina */}
                  <div className="p-7">
                    <div className="text-amber-300 text-xs font-bold tracking-wider uppercase mb-2">
                      📍 {property.location}
                    </div>
                    <h3 className="text-white text-3xl font-medium leading-snug line-clamp-2 min-h-[5rem] mb-5 group-hover:text-amber-300 transition-colors">
                      {property.title}
                    </h3>
                    
                    {/* Tehnične podrobnosti */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-4 text-white/60 text-sm font-medium">
                      <span className="flex items-center gap-1">📐 {property.area} m²</span>
                      <span className="flex items-center gap-1">
                        💶 {property.area > 0 ? `${Math.round(property.price / property.area).toLocaleString('sl-SI')} €/m²` : '/'}
                      </span>
                      <span className="flex items-center gap-1">
                        🚪 {property.rooms} {property.rooms === 1 ? 'soba' : property.rooms === 2 ? 'sobi' : property.rooms === 3 || property.rooms === 4 ? 'sobe' : 'sob'}
                      </span>
                      <span className="flex items-center gap-1">📅 {property.year}</span>
                    </div>

                    {/* Cena */}
                    <div className="flex items-center justify-between border-t border-white/10 mt-5 pt-5">
                      <div className="text-4xl font-semibold text-white">
                        {property.price.toLocaleString('sl-SI')} €
                      </div>
                      <span className="text-lg text-amber-300 font-semibold tracking-wider hover:underline cursor-pointer">
                        {t.details} →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}