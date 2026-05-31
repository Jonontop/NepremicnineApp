"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faMapMarkerAlt,
  faSortAmountDown, faRulerCombined, faTag,
  faEye, faChevronLeft, faChevronRight,
  faCalculator,
  faMoneyBill
} from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '../ThemeProvider'; // ── 1. KORAK: Uvoziva globalni Theme Context

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Listing {
  id: string | number;
  location: string;
  price: number | null;
  price_unit?: string | null;
  area: number | null;
  status: string;
  type?: string | null;
  site: string;
  link: string;
  image?: string;
  features?: string[];
  posodobljeno_ob?: string;
  weight?: number;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
const REGION_KEYWORDS: Record<string, string[]> = {
  'Osrednjeslovenska': ['ljubljana', 'domžale', 'kamnik', 'grosuplje', 'litija', 'vrhnika', 'logatec', 'medvode', 'trzin', 'ig'],
  'Podravska': ['maribor', 'ptuj', 'slovenska bistrica', 'lenart', 'ormož', 'ruše'],
  'Savinjska': ['celje', 'žalec', 'velenje', 'laško', 'mozirje', 'šentjur', 'štore'],
  'Gorenjska': ['kranj', 'jesenice', 'radovljica', 'tržič', 'škofja loka', 'bled', 'bohinj'],
  'Obalno-kraška': ['koper', 'piran', 'izola', 'portorož', 'sežana', 'postojna'],
  'Dolenjska': ['novo mesto', 'trebnje', 'kočevje', 'črnomelj', 'metlika'],
  'Goriška': ['nova gorica', 'ajdovščina', 'idrija', 'tolmin'],
  'Koroška': ['slovenj gradec', 'ravne', 'dravograd', 'mežica'],
  'Zasavska': ['trbovlje', 'zagorje', 'hrastnik'],
  'Pomurska': ['murska sobota', 'lendava', 'gornja radgona'],
  'Posavska': ['krško', 'brežice', 'sevnica'],
  'Primorsko-notranjska': ['postojna', 'ilirska bistrica', 'pivka', 'cerknica'],
};

function getRegion(location: string): string {
  const loc = (location || '').toLowerCase();
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((k) => loc.includes(k))) return region;
  }
  return 'Ostalo';
}

function extractKraj(location: string): string {
  const part = (location || '').split(/[,\-–]/)[0].trim();
  return part.length > 0 ? part : location;
}

function mapTypeGroup(rawType: string | null | undefined): string {
  const t = (rawType || '').toLowerCase();
  if (t.includes('hiš') || t.includes('hi') || t.includes('house')) return 'hisa';
  if (t.includes('vikend')) return 'vikend';
  if (t.includes('poslov') || t.includes('office')) return 'poslovni';
  if (t.includes('zem') || t.includes('parcela') || t.includes('land')) return 'zemljisce';
  return 'stanovanje';
}

function isValidListing(l: Listing): boolean {
  if (!l.price || l.price <= 0) return false;
  if (!l.location || l.location.trim() === '' || l.location.trim().toLowerCase() === 'n/a') return false;
  return true;
}

function getPriceUnit(listing: Listing): 'total' | 'per_m2' {
  const unit = (listing.price_unit || '').toLowerCase();
  if (unit.includes('m2') || unit.includes('m²') || unit.includes('sqm')) return 'per_m2';
  const featureText = (listing.features || []).join(' ').toLowerCase();
  if (featureText.includes('€/m') || featureText.includes('eur/m') || featureText.includes('cena na m')) return 'per_m2';
  return 'total';
}

function getComparablePrice(listing: Listing): number | null {
  if (!listing.price || listing.price <= 0) return null;
  if (getPriceUnit(listing) === 'per_m2' && listing.area && listing.area > 0) {
    return Math.round(Number(listing.price) * Number(listing.area));
  }
  return Number(listing.price);
}

function formatListingPrice(listing: Listing): string {
  if (!listing.price || listing.price <= 0) return 'Po dogovoru';
  const suffix = getPriceUnit(listing) === 'per_m2' ? ' €/m²' : ' €';
  return `${Number(listing.price).toLocaleString('sl-SI')}${suffix}`;
}

function formatPricePerM2(listing: Listing): string {
  if (!listing.price || !listing.area || listing.area <= 0) return '/';
  if (getPriceUnit(listing) === 'per_m2') {
    return `${Number(listing.price).toLocaleString('sl-SI')} €/m²`;
  }
  return `${Math.round(Number(listing.price) / Number(listing.area)).toLocaleString('sl-SI')} €/m²`;
}

// ── PRICE SLIDER ──────────────────────────────────────────────────────────────
// Tukaj sedaj useTheme poskrbi, da komponenta ve za isDark podatek
function PriceRangeSlider({
  minValue, maxValue, onChange
}: {
  minValue: number | null;
  maxValue: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const MAX = 1_500_000;
  const STEP = 10_000;
  const min = minValue ?? 0;
  const max = maxValue ?? MAX;
  const minDisplay = minValue === null ? '0 \u20ac' : `${minValue.toLocaleString('sl-SI')} \u20ac`;
  const maxDisplay = maxValue === null ? 'Brez omejitve' : `${maxValue.toLocaleString('sl-SI')} \u20ac`;
  const left = (min / MAX) * 100;
  const right = 100 - (max / MAX) * 100;

  const updateMin = (raw: number) => {
    const nextMin = Math.min(raw, max - STEP);
    onChange(nextMin <= 0 ? null : nextMin, maxValue);
  };

  const updateMax = (raw: number) => {
    const nextMax = Math.max(raw, min + STEP);
    onChange(minValue, nextMax >= MAX ? null : nextMax);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cena</label>
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          {minDisplay} - {maxDisplay}
        </span>
      </div>
      <div className="relative h-6">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-amber-400"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <input
          type="range"
          min={0}
          max={MAX}
          step={STEP}
          value={min}
          onChange={(e) => updateMin(Number(e.target.value))}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent accent-amber-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        />
        <input
          type="range"
          min={0}
          max={MAX}
          step={STEP}
          value={max}
          onChange={(e) => updateMax(Number(e.target.value))}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent accent-amber-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>0 \u20ac</span>
        <span>750k \u20ac</span>
        <span>Brez omejitve</span>
      </div>
    </div>
  );
}

// ── PAGINATION ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 30;

// ── MAIN CONTENT COMPONENT ─────────────────────────────────────────────────
function SearchContent() {
  const searchParams = useSearchParams();

  // ── 2. KORAK: Pridobimo globalno temo, da prisilimo React v re-render ob kliku v Navbaru
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  const initialMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
  const initialMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;

  const [filters, setFilters] = useState({
    action: searchParams.get('action') || 'vse',
    type: searchParams.get('type') || 'vse',
    location: searchParams.get('location') || '',
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    sortBy: 'weight_desc',
  });

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const response = await fetch('/api/properties?limit=1000&orderBy=weight_desc');
        if (!response.ok) throw new Error('Napaka pri pridobivanju oglasov');
        const data = await response.json();
        setListings((data as Listing[]) || []);
      } catch (err) {
        console.error('Napaka pri pridobivanju oglasov:', err);
      }
      setLoading(false);
    }
    fetchListings();
  }, []);

  const groupedLocations = useMemo(() => {
    const krajSet = new Map<string, Set<string>>();
    for (const l of listings) {
      if (!l.location || l.location.toLowerCase() === 'n/a') continue;
      const kraj = extractKraj(l.location);
      const region = getRegion(l.location);
      if (!krajSet.has(region)) krajSet.set(region, new Set());
      krajSet.get(region)!.add(kraj);
    }
    return Array.from(krajSet.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'sl'))
      .map(([region, kraji]) => ({ region, values: Array.from(kraji).sort((a, b) => a.localeCompare(b, 'sl')) }));
  }, [listings]);

  const filteredListings = useMemo(() => {
    let temp = listings.filter(isValidListing);
    if (filters.action !== 'vse') temp = temp.filter((l) => l.status?.toLowerCase().includes(filters.action.toLowerCase()));
    if (filters.type !== 'vse') temp = temp.filter((l) => mapTypeGroup(l.type) === filters.type);
    if (filters.location.trim() !== '') {
      temp = temp.filter((l) => (l.location?.toLowerCase().includes(filters.location.toLowerCase()) || extractKraj(l.location || '').toLowerCase().includes(filters.location.toLowerCase())));
    }
    if (filters.minPrice !== null) temp = temp.filter((l) => { const comparablePrice = getComparablePrice(l); return comparablePrice !== null && comparablePrice >= filters.minPrice!; });
    if (filters.maxPrice !== null) temp = temp.filter((l) => { const comparablePrice = getComparablePrice(l); return comparablePrice !== null && comparablePrice <= filters.maxPrice!; });

    temp.sort((a, b) => {
      if (filters.sortBy === 'weight_desc') {
        const wDiff = (b.weight ?? 50) - (a.weight ?? 50);
        if (wDiff !== 0) return wDiff;
        return new Date(b.posodobljeno_ob || 0).getTime() - new Date(a.posodobljeno_ob || 0).getTime();
      }
      if (filters.sortBy === 'newest') return new Date(b.posodobljeno_ob || 0).getTime() - new Date(a.posodobljeno_ob || 0).getTime();
      if (filters.sortBy === 'price_asc') return (getComparablePrice(a) ?? Infinity) - (getComparablePrice(b) ?? Infinity);
      if (filters.sortBy === 'price_desc') return (getComparablePrice(b) ?? -Infinity) - (getComparablePrice(a) ?? -Infinity);
      if (filters.sortBy === 'area_desc') return (b.area ?? -Infinity) - (a.area ?? -Infinity);
      return 0;
    });
    return temp;
  }, [listings, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const paginated = filteredListings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (name: string, value: string | number | null) => { setCurrentPage(1); setFilters((prev) => ({ ...prev, [name]: value })); };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-[#0f172a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-2xl font-medium text-slate-500 dark:text-slate-300">Nalagam nepremičnine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-900 dark:bg-[#0f172a] dark:text-slate-100 selection:bg-amber-300 selection:text-slate-900">

      {/* Kontrolna vrstica za Layout Mode */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex justify-end">
        <button 
          onClick={() => setLayoutMode((mode) => (mode === 'grid' ? 'list' : 'grid'))} 
          title={layoutMode === 'grid' ? 'Seznam' : 'Mreža'} 
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border font-medium transition-colors bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <FontAwesomeIcon icon={faBuilding} className="text-amber-500" />
          {layoutMode === 'grid' ? 'Prikaži kot Seznam' : 'Prikaži ako Mrežo'}
        </button>
      </div>

      {/* Filter vrstica */}
      <section className="bg-white border-b border-slate-200 py-5 shadow-sm mt-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faTag} className="text-[10px]" /> Tip posla
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-xl border p-1 bg-slate-50 border-slate-300 dark:bg-slate-800 dark:border-slate-700">
                {[['vse', 'Vse'], ['prodaja', 'Prodaja'], ['oddaja', 'Oddaja']].map(([value, label]) => (
                  <button 
                    key={value} 
                    type="button" 
                    onClick={() => handleFilterChange('action', value)} 
                    className={`rounded-lg px-2 py-2.5 text-xs font-bold transition-all ${
                      filters.action === value 
                        ? 'bg-amber-400 text-slate-950 shadow-sm' 
                        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faBuilding} className="text-[10px]" /> Vrsta
              </label>
              <select 
                value={filters.type} 
                onChange={(e) => handleFilterChange('type', e.target.value)} 
                className="w-full border text-sm font-medium rounded-xl p-3 outline-none focus:border-amber-400 appearance-none cursor-pointer bg-slate-50 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              >
                <option value="vse">Vse vrste</option>
                <option value="stanovanje">Stanovanje</option>
                <option value="hisa">Hiša</option>
                <option value="poslovni">Poslovni prostor</option>
                <option value="zemljisce">Zemljišče</option>
                <option value="vikend">Vikend</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px]" /> Kraj
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-sm" />
                </div>
                <select 
                  value={filters.location} 
                  onChange={(e) => { handleFilterChange('location', e.target.value); }} 
                  className="w-full border text-sm font-medium rounded-xl pl-9 p-3 outline-none focus:border-amber-400 appearance-none cursor-pointer bg-slate-50 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  <option value="">Vse lokacije</option>
                  {groupedLocations.map(({ region, values }) => (
                    <optgroup key={region} label={region}>
                      {values.map((kraj) => (<option key={kraj} value={kraj}>{kraj}</option>))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faSortAmountDown} className="text-[10px]" /> Razvrstitev
              </label>
              <select 
                value={filters.sortBy} 
                onChange={(e) => handleFilterChange('sortBy', e.target.value)} 
                className="w-full border text-sm font-bold rounded-xl p-3 outline-none focus:border-amber-400 appearance-none cursor-pointer bg-slate-50 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-amber-300"
              >
                <option value="weight_desc">⭐ Priporočeno</option>
                <option value="newest">Najnovejši</option>
                <option value="price_asc">Cena: naraščajoče</option>
                <option value="price_desc">Cena: padajoče</option>
                <option value="area_desc">Površina: največje</option>
              </select>
            </div>
          </div>

          <div className="mt-4 max-w-md">
            <PriceRangeSlider minValue={filters.minPrice} maxValue={filters.maxPrice} onChange={(min, max) => { setCurrentPage(1); setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max })); }} />
          </div>
        </div>
      </section>

      {/* Glavni seznam/mreža */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Najdeno: <span className="font-bold text-lg text-amber-600 normal-case ml-1">{filteredListings.length}</span> oglasov
            {totalPages > 1 && (<span className="ml-3 text-xs font-normal text-slate-400 dark:text-slate-500">— stran {currentPage}/{totalPages}</span>)}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex-1 min-w-0 w-full">
            {filteredListings.length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-2xl border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <p className="text-base font-medium mb-3">Ni zadetkov za izbrane filtre.</p>
                <button onClick={() => setFilters({ action: 'vse', type: 'vse', location: '', minPrice: null, maxPrice: null, sortBy: 'weight_desc' })} className="text-sm text-amber-500 underline">Ponastavi filtre</button>
              </div>
            ) : (
              <>
                <div className={layoutMode === 'grid' ? 'grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]' : 'grid grid-cols-1 gap-5'}>
                  {paginated.map((listing, idx) => (
                    <div 
                      key={listing.id} 
                      className="rounded-3xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-amber-300/40 group shadow-[0_4px_30px_rgba(0,0,0,0.15)] bg-white border-slate-200 text-slate-900 dark:border-slate-800/40 dark:text-white dark:bg-slate-900"
                    >
                      <div className="h-52 w-full bg-slate-950 relative overflow-hidden">
                        {listing.image ? (
                          <div className="w-full h-full relative">
                            <Image src={listing.image} alt={listing.location} fill sizes="(max-width: 768px) 100vw, 50vw" loading={idx < 6 ? 'eager' : 'lazy'} className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized={true} />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 bg-slate-950 flex-col gap-1.5">
                            <FontAwesomeIcon icon={faBuilding} className="text-3xl text-white/10" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Ni slike</span>
                          </div>
                        )}

                        <div className="absolute inset-0 pointer-events-none z-10 bg-black/20 dark:bg-black/40" />

                        <span className="absolute top-3 right-3 z-20 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-lg tracking-wide bg-white/90 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:text-white/80 dark:border-white/10">{listing.site}</span>
                        <span className={`absolute bottom-3 left-3 z-20 backdrop-blur-md text-xs font-semibold px-2.5 py-1 rounded-md tracking-wide capitalize ${listing.status?.toLowerCase().includes('oddaja') ? 'bg-indigo-500/80 text-white' : 'bg-amber-500/80 text-slate-950'}`}>{listing.status || 'Prodaja'}</span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <h2 className="text-base font-semibold line-clamp-2 leading-snug transition-colors text-slate-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-300" title={listing.location}>
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-slate-400 mr-1.5 text-sm inline" />{listing.location || 'Neznana lokacija'}
                            </h2>
                            <span className="text-xl font-bold whitespace-nowrap text-slate-900 dark:text-white">{formatListingPrice(listing)}</span>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm font-medium border-t pt-3 mb-4 text-slate-600 border-slate-200 dark:text-white/70 dark:border-white/10">
                            <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faRulerCombined} className="text-slate-400" />{listing.area && listing.area > 0 ? `${listing.area} m²` : '/'}</span>
                            <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faMoneyBill} className="text-[#90a1b9]" /> {formatPricePerM2(listing)}</span>
                            <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faTag} className="text-slate-400" /><span className="capitalize">{listing.type || listing.status || 'Prodaja'}</span></span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <a href={listing.link} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all text-xs shadow-lg shadow-amber-400/10 active:scale-[0.98] flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faEye} /> Oglej oglas
                          </a>
                          <button title="Izračunaj stroške (ETN)" className="px-3 py-3 rounded-xl border text-sm transition-colors border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                            <FontAwesomeIcon icon={faCalculator} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button 
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
                      disabled={currentPage === 1} 
                      className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-30 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) page = i + 1;
                      else if (currentPage <= 4) page = i + 1;
                      else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                      else page = currentPage - 3 + i;
                      return (
                        <button 
                          key={page} 
                          onClick={() => setCurrentPage(page)} 
                          className={`w-10 h-10 rounded-xl border text-sm font-semibold transition-colors ${
                            currentPage === page 
                              ? 'bg-amber-400 border-amber-400 text-slate-950' 
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button 
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages} 
                      className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-30 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-[#0f172a]">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}