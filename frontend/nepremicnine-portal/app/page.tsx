"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CountUp from 'react-countup';
import { useLanguage } from './LanguageContext';

interface Property {
  id: string;
  title: string;
  location: string;
  city: 'Ljubljana' | 'Maribor' | 'Koper' | 'Kranj' | 'Celje';
  price: number;
  priceUnit: 'total' | 'per_m2';
  totalPrice: number;
  area: number;
  rooms: number;
  year: number;
  image: string;
  link: string; // Povezava do izvorne strani agencije v bazi podatkov
  badgeType: 'emerald' | 'slate' | 'amber' | 'indigo';
  badgeText: string;
  isPremium?: boolean;
  filterTag: 'novogradnje' | '24h' | 'premium' | 'rabljeno';
  type: 'stanovanje' | 'hisa' | 'poslovni' | 'vikend';
  weight: number;
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

const translations = {
  sl: {
    portalLabel: 'Nepremičninski portal',
    heroTitle1: 'Odkrijte bivalne',
    heroTitle2: 'prostore',
    heroTitle3: 'z značajem.',
    heroDesc: 'Najcelovitejša zbirka nepremičnin v Sloveniji. Resnični podatki trga, agregirani iz preverjenih agencij brez podvajanja.',
    activeAds: 'Aktivnih oglasov',
    newbuilds: 'Novogradnje',
    locations: 'Lokacij',
    propertyLocation: 'Lokacija nepremičnine',
    allSlovenia: 'Vsa Slovenija',
    rooms: 'Število sob',
    priceRange: 'Cenovni okvir (€)',
    minPrice: 'Min cena',
    maxPrice: 'Max cena',
    searchBtn: 'Poišči nepremičnine',
    apartment: 'Stanovanje',
    house: 'Hiša',
    commercial: 'Poslovni prostor',
    weekend: 'Vikend',
    categoryTitle: 'Poiščite ponudbo glede na vrsto nepremičnine',
    poslovni: 'Poslovni prostori',
    zemljisca: 'Zemljišča',
    hise: 'Hiše',
    stanovanja: 'Stanovanja',
    forSale: 'Prodaja',
    forRent: 'Oddaja',
    premiumTitle: 'Najnovejša Premium Ponudba',
    loading: 'Pridobivanje oglasov...',
    noListings: 'V bazi trenutno ni top oglasov.',
    details: 'Podrobnosti →',
    showAll: 'Prikaži vse oglase →',
    newbuild: 'Novogradnja',
  },
  en: {
    portalLabel: 'Real Estate Portal',
    heroTitle1: 'Discover living',
    heroTitle2: 'spaces',
    heroTitle3: 'with character.',
    heroDesc: 'The most comprehensive collection of properties in Slovenia. Real market data aggregated from verified agencies without duplicates.',
    activeAds: 'Active Listings',
    newbuilds: 'New Builds',
    locations: 'Locations',
    propertyLocation: 'Property Location',
    allSlovenia: 'All of Slovenia',
    rooms: 'Number of Rooms',
    priceRange: 'Price Range (€)',
    minPrice: 'Min price',
    maxPrice: 'Max price',
    searchBtn: 'Search Properties',
    apartment: 'Apartment',
    house: 'House',
    commercial: 'Commercial Space',
    weekend: 'Weekend House',
    categoryTitle: 'Find listings by property type',
    poslovni: 'Commercial Units',
    zemljisca: 'Lands',
    hise: 'Houses',
    stanovanja: 'Apartments',
    forSale: 'For Sale',
    forRent: 'For Rent',
    premiumTitle: 'Latest Premium Listings',
    loading: 'Loading listings...',
    noListings: 'No top listings in the database yet.',
    details: 'Details →',
    showAll: 'Show all listings →',
    newbuild: 'New Build',
  },
};

export default function EstateMS() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [animateStats, setAnimateStats] = useState<boolean>(false);
  
  const [typeCounts, setTypeCounts] = useState<TypeStats>({ poslovni: 0, zemljisca: 0, hise: 0, stanovanja: 0 });
  const [actionCounts, setActionCounts] = useState<ActionStats>({});
  const [activeAdsCount, setActiveAdsCount] = useState<number>(0);
  const [newbuildCount, setNewbuildCount] = useState<number>(0);
  const [regionsCount, setRegionsCount] = useState<number>(0);

  // Iskalna stanja
  const [searchType, setSearchType] = useState<string>('stanovanje');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [searchMinPrice, setSearchMinPrice] = useState<string>('');
  const [searchMaxPrice, setSearchMaxPrice] = useState<string>('');
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);

  useEffect(() => {
    const fetchTopProperties = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/properties?limit=6&orderBy=weight_desc&view=home');
        if (!response.ok) throw new Error('Napaka pri pridobivanju podatkov');
        const data = await response.json();
        setProperties((data || []).filter((p: Property) => p && p.id && p.title));
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
        if (!response.ok) throw new Error('Napaka pri pridobivanju statistike');
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
    setAnimateStats(true);
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchType) params.set('type', searchType);
    if (searchLocation) params.set('location', searchLocation);
    if (searchMinPrice) params.set('minPrice', searchMinPrice);
    if (searchMaxPrice) params.set('maxPrice', searchMaxPrice);
    if (selectedRooms) params.set('rooms', selectedRooms.toString());
    router.push(`/search?${params.toString()}`);
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'emerald': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'amber': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'indigo': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Category data with translated labels
  const categoryItems = [
    { key: 'poslovni', label: t.poslovni, img: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80' },
    { key: 'zemljisca', label: t.zemljisca, img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' },
    { key: 'hise', label: t.hise, img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80' },
    { key: 'stanovanja', label: t.stanovanja, img: 'https://images.unsplash.com/photo-1597047084897-51e81819a499?auto=format&fit=crop&w=800&q=80' },
  ];

  const searchTypeOptions = [
    { id: 'stanovanje', label: t.apartment },
    { id: 'hisa', label: t.house },
    { id: 'poslovni', label: t.commercial },
    { id: 'vikend', label: t.weekend },
  ];

  return (
    <div className="min-h-screen transition-colors duration-200 dark:bg-[#0f172a] dark:text-slate-100 bg-slate-100 text-slate-900">
      
      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden py-12 lg:py-28 px-4 sm:px-6 border-b dark:border-slate-800 border-slate-200 bg-gradient-to-b dark:from-[#0f172a] dark:to-[#111827] from-white to-slate-100">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image src="/hero.png" alt="" aria-hidden={true} priority fill className="object-cover opacity-30 scale-105" />
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-12 gap-8 lg:gap-8 items-center justify-center">
          <div className="lg:col-span-5 text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="flex items-center gap-3 mb-5 justify-center lg:justify-start">
              <span className="w-8 h-px bg-amber-400 hidden lg:block" />
              <span className="text-amber-300 text-xs uppercase font-bold tracking-widest drop-shadow-lg">{t.portalLabel}</span>
            </div>
            <h1 className="text-white drop-shadow-lg text-4xl sm:text-6xl lg:text-7xl font-semibold leading-[1.12] mb-6">
              {t.heroTitle1}<br />
              <em className="text-amber-400 not-italic font-semibold">{t.heroTitle2}</em><br />
              {t.heroTitle3}
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-md mb-8 mx-auto lg:mx-0">
              {t.heroDesc}
            </p>
            
            <div className="flex gap-4 sm:gap-6 border-t dark:border-slate-700 border-slate-200 pt-6 w-full max-w-sm justify-center lg:justify-start">
              <div className="text-center lg:text-left">
                <div className="text-white text-xl sm:text-2xl font-bold">
                  {animateStats ? <CountUp end={activeAdsCount} duration={1.3} separator="." /> : 0}
                </div>
                <div className="text-white/70 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mt-0.5">{t.activeAds}</div>
              </div>
              <div className="w-px dark:bg-slate-700 bg-slate-200" />
              <div className="text-center lg:text-left">
                <div className="text-white text-xl sm:text-2xl font-bold">
                  {animateStats ? <CountUp end={newbuildCount} duration={1.3} separator="." /> : 0}
                </div>
                <div className="text-white/70 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mt-0.5">{t.newbuilds}</div>
              </div>
              <div className="w-px dark:bg-slate-700 bg-slate-200" />
              <div className="text-center lg:text-left">
                <div className="text-white text-xl sm:text-2xl font-bold">
                  {animateStats ? <CountUp end={regionsCount} duration={1.3} separator="." /> : 0}
                </div>
                <div className="text-white/70 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mt-0.5">{t.locations}</div>
              </div>
            </div>
          </div>

          {/* Search card */}
          <div className="lg:col-span-7 w-full max-w-xl mx-auto p-4 sm:p-6 md:p-9 rounded-2xl shadow-xl dark:bg-slate-900/95 dark:border dark:border-slate-700/80 bg-white border border-slate-200">
            <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-4 mb-6 overflow-x-auto no-scrollbar scrollbar-none snap-x">
              {searchTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSearchType(opt.id)}
                  className={`px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all border whitespace-nowrap snap-start ${searchType === opt.id ? 'border-amber-400 bg-amber-400/10 text-amber-500 shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-slate-500 text-[11px] uppercase font-bold tracking-wider mb-2">{t.propertyLocation}</label>
                <div className="relative">
                  <select 
                    value={searchLocation} 
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full border rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:border-amber-400 appearance-none cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 bg-slate-50 border-slate-300 text-slate-800"
                  >
                    <option value="">{t.allSlovenia}</option>
                    <option value="Ljubljana">Ljubljana</option>
                    <option value="Maribor">Maribor</option>
                    <option value="Koper">Koper</option>
                    <option value="Kranj">Kranj</option>
                    <option value="Celje">Celje</option>
                  </select>
                  <span className="absolute right-3 top-3.5 pointer-events-none text-xs opacity-50">▼</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] uppercase font-bold tracking-wider mb-2">{t.rooms}</label>
                <div className="flex gap-1 border p-1 rounded-xl dark:bg-slate-800 dark:border-slate-700 bg-slate-50 border-slate-300 w-full overflow-hidden">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedRooms(selectedRooms === num ? null : num)}
                      className={`flex-1 text-center py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${selectedRooms === num ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-500'}`}
                    >
                      {num === 5 ? '5+' : num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-slate-500 text-[11px] uppercase font-bold tracking-wider mb-2">{t.priceRange}</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="number" 
                  placeholder={t.minPrice} 
                  value={searchMinPrice}
                  onChange={(e) => setSearchMinPrice(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-amber-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 bg-slate-50 border-slate-300"
                />
                <input 
                  type="number" 
                  placeholder={t.maxPrice} 
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-amber-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 bg-slate-50 border-slate-300"
                />
              </div>
            </div>

            <button onClick={handleSearch} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider py-3.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg active:scale-[0.99]">
              {t.searchBtn}
            </button>
          </div>
        </div>
      </section>

      {/* ── KATEGORIJE TRGA ── */}
      <section id="type-offers" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24 bg-slate-300/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 mt-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-10 dark:text-white text-slate-900 text-center sm:text-left">{t.categoryTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoryItems.map((item) => {
            const typeMap: Record<string, string> = { poslovni: 'poslovni', zemljisca: 'zemljisce', hise: 'hisa', stanovanja: 'stanovanje' };
            const typeParam = typeMap[item.key] ?? '';
            return (
              <div key={item.key} onClick={() => router.push(`/search?type=${typeParam}`)} className="cursor-pointer dark:bg-slate-900/60 dark:border-slate-800 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-xl">
                <div className="dark:text-slate-100 text-slate-800 text-xl font-semibold mb-3">{item.label}</div>
                <div className="relative h-44 rounded-xl overflow-hidden mb-3">
                  <Image src={item.img} alt={item.label} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white text-5xl font-bold">
                    {animateStats ? <CountUp end={typeCounts[item.key as keyof TypeStats] || 0} duration={1.3} separator="." /> : 0}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/search?type=${typeParam}&action=prodaja`} onClick={(e) => e.stopPropagation()} className="block text-center bg-rose-500/10 hover:bg-rose-500/20 rounded-lg py-2 text-xs font-semibold text-rose-500 transition-colors">{t.forSale} {actionCounts[item.key]?.prodaja ?? 0}</Link>
                  <Link href={`/search?type=${typeParam}&action=oddaja`} onClick={(e) => e.stopPropagation()} className="block text-center bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg py-2 text-xs font-semibold text-emerald-500 transition-colors">{t.forRent} {actionCounts[item.key]?.oddaja ?? 0}</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── PROPERTY GRID ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24" id="listings">
        <div className="flex items-center justify-between mb-10 text-center sm:text-left w-full">
          <h2 className="text-3xl sm:text-4xl font-bold dark:text-white text-slate-900 w-full">{t.premiumTitle}</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">{t.loading}</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-white/5">
            <p className="text-slate-400 text-base font-medium">{t.noListings}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => {
                const isLiked = favorites.includes(property.id);
                const isHighWeightPremium = property.weight >= 80 || property.isPremium;
                
                const destinationUrl = property.link || `/property/${property.id}`;
                const isExternal = !!property.link;

                return (
                  <div 
                    key={property.id} 
                    className={`rounded-3xl overflow-hidden border transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl bg-white dark:bg-slate-900/80 ${
                      isHighWeightPremium ? 'border-amber-400/40 shadow-xl' : 'dark:border-slate-800/60 border-slate-200'
                    }`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                      {property.image && (
                        <Image 
                          src={property.image} 
                          alt={property.title} 
                          fill 
                          sizes="(max-width: 768px) 100vw, 33vw" 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      )}
                      <button 
                        onClick={(e) => toggleFavorite(property.id, e)} 
                        className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md w-10 h-10 rounded-2xl flex items-center justify-center text-base border border-white/10"
                      >
                        {isLiked ? '❤️' : '♡'}
                      </button>
                      <div className="absolute bottom-3 left-3">
                        <span className={`text-[11px] font-bold tracking-wider uppercase border rounded-md px-2.5 py-1 backdrop-blur-md ${getBadgeClass(property.badgeType)}`}>
                          {property.filterTag === 'novogradnje' ? t.newbuild : property.badgeText}
                        </span>
                      </div>
                    </div>

                    <div className="p-7">
                      <div className="dark:text-amber-400 text-amber-600 text-xs font-bold tracking-wider uppercase mb-2">📍 {property.location}</div>
                      <h3 className="dark:text-white text-slate-900 text-xl font-semibold leading-snug line-clamp-2 min-h-[56px] mb-5 group-hover:text-amber-500 transition-colors">
                        {property.title}
                      </h3>
                      
                      <div className="flex items-center justify-between border-t pt-4 text-xs font-medium dark:border-white/10 dark:text-white/60 border-slate-200 text-slate-600">
                        <span>📐 {property.area} m²</span>
                        <span>{property.priceUnit === 'per_m2' ? `${property.price} €/m²` : `${Math.round(property.price / (property.area || 1))} €/m²`}</span>
                        <span>🚪 {property.rooms} sob</span>
                      </div>

                      <div className="flex items-center justify-between border-t mt-5 pt-5 dark:border-white/10 border-slate-200">
                        <div className="text-2xl font-bold dark:text-white text-slate-900">{property.price.toLocaleString('sl-SI')} €</div>
                        <a 
                          href={destinationUrl} 
                          target={isExternal ? "_blank" : "_self"}
                          rel={isExternal ? "noopener noreferrer" : undefined}
                          className="text-sm text-amber-400 font-semibold tracking-wider hover:underline"
                        >
                          {t.details}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show all button */}
            <div className="flex justify-center mt-12 px-4">
              <Link
                href="/search"
                className="w-full sm:w-auto text-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider px-8 py-4 rounded-xl text-xs transition-all shadow-md hover:shadow-lg active:scale-98"
              >
                {t.showAll}
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Anchors for About and FAQ sections */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 py-4" />
      <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 py-4" />

    </div>
  );
}