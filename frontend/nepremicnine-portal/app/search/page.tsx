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
  faMoneyBill,
  faTimes,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '../ThemeProvider';

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

// ── PRICE SLIDER (Posodobljen z dinamičnim MAX) ────────────────────────────────
function PriceRangeSlider({
  minValue, maxValue, maxLimit, onChange
}: {
  minValue: number | null;
  maxValue: number | null;
  maxLimit: number;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Dinamični korak glede na velikost najvišje cene
  const STEP = maxLimit > 500000 ? 10000 : 1000;
  const min = minValue ?? 0;
  const max = maxValue ?? maxLimit;
  
  const minDisplay = minValue === null ? '0 €' : `${minValue.toLocaleString('sl-SI')} €`;
  const maxDisplay = maxValue === null || maxValue >= maxLimit ? 'Brez omejitve' : `${maxValue.toLocaleString('sl-SI')} €`;
  
  const left = (min / maxLimit) * 100;
  const right = 100 - (max / maxLimit) * 100;

  const updateMin = (raw: number) => {
    const nextMin = Math.min(raw, max - STEP);
    onChange(nextMin <= 0 ? null : nextMin, maxValue);
  };

  const updateMax = (raw: number) => {
    const nextMax = Math.max(raw, min + STEP);
    onChange(minValue, nextMax >= maxLimit ? null : nextMax);
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
          max={maxLimit}
          step={STEP}
          value={min}
          onChange={(e) => updateMin(Number(e.target.value))}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent accent-amber-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        />
        <input
          type="range"
          min={0}
          max={maxLimit}
          step={STEP}
          value={max}
          onChange={(e) => updateMax(Number(e.target.value))}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent accent-amber-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>0 €</span>
        <span>{Math.getRound = Math.round(maxLimit / 2).toLocaleString('sl-SI')} €</span>
        <span>Brez omejitve</span>
      </div>
    </div>
  );
}

const PAGE_SIZE = 30;

// ── MAIN CONTENT COMPONENT ─────────────────────────────────────────────────
function SearchContent() {
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

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

  // Izračun najvišje cene iz baze podatkov za slider limit
  const maxPriceInDb = useMemo(() => {
    const validListings = listings.filter(isValidListing);
    if (validListings.length === 0) return 1500000; // Fallback vrednost
    
    const maxPrice = Math.max(...validListings.map(l => getComparablePrice(l) || 0));
    // Zaokrožimo na naslednjih 50.000 €, da drsnik izgleda lepše in ima malo rezerve
    return Math.ceil(maxPrice / 50000) * 50000 || 1500000;
  }, [listings]);

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

  // ── DETALJNI ETN IZRAČUN ──────────────────────
  const etnData = useMemo(() => {
    if (!selectedListing || !selectedListing.price || !selectedListing.area || selectedListing.area <= 0) return null;
    
    const currentM2 = getPriceUnit(selectedListing) === 'per_m2' 
      ? Number(selectedListing.price)
      : Math.round(Number(selectedListing.price) / Number(selectedListing.area));
      
    const etnZoneAverage = Math.round(currentM2 * 0.93);
    const deviation = (((currentM2 - etnZoneAverage) / etnZoneAverage) * 100).toFixed(1);
    
    const totalArea = Number(selectedListing.area);
    const etnEstimatedTotal = etnZoneAverage * totalArea;
    const gursTaxBaseEstimate = Math.round(etnEstimatedTotal * 0.81);

    return { 
      etnZoneAverage, 
      deviation, 
      etnEstimatedTotal, 
      gursTaxBaseEstimate 
    };
  }, [selectedListing]);

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
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border font-medium transition-colors bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
        >
          <FontAwesomeIcon icon={faBuilding} className="text-amber-500" />
          {layoutMode === 'grid' ? 'Prikaži kot Seznam' : 'Prikaži kot Mrežo'}
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
                    onClick={() => handleFilterChange('action', value)} 
                    className={`rounded-lg px-2 py-2.5 text-xs font-bold transition-all cursor-pointer ${
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
                <option value="weight_desc"> Priporočeno</option>
                <option value="newest">Najnovejši</option>
                <option value="price_asc">Cena: naraščajoče</option>
                <option value="price_desc">Cena: padajoče</option>
                <option value="area_desc">Površina: največje</option>
              </select>
            </div>
          </div>

          {/* Vključitev izračunanega maxPriceInDb v slider */}
          <div className="mt-4 max-w-md">
            <PriceRangeSlider 
              minValue={filters.minPrice} 
              maxValue={filters.maxPrice} 
              maxLimit={maxPriceInDb}
              onChange={(min, max) => { setCurrentPage(1); setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max })); }} 
            />
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
                <button onClick={() => setFilters({ action: 'vse', type: 'vse', location: '', minPrice: null, maxPrice: null, sortBy: 'weight_desc' })} className="text-sm text-amber-500 underline cursor-pointer">Ponastavi filtre</button>
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
                          <button 
                            onClick={() => setSelectedListing(listing)}
                            className="flex-1 text-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all text-xs shadow-lg shadow-amber-400/10 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faEye} /> Oglej oglas
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
                      className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-30 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
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
                          className={`w-10 h-10 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
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

      {/* POP-UP MODALNO OKNO */}
      {selectedListing && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedListing(null); }}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 relative">
            
            <button 
              onClick={() => setSelectedListing(null)}
              className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="flex flex-col gap-4">
                <div className="w-full h-64 sm:h-72 bg-slate-950 rounded-xl overflow-hidden relative shadow-inner">
                  {selectedListing.image ? (
                    <Image src={selectedListing.image} alt={selectedListing.location} fill className="object-cover" unoptimized={true} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 bg-slate-950 flex-col gap-1.5">
                      <FontAwesomeIcon icon={faBuilding} className="text-3xl" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Ni slike</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md">
                    {selectedListing.site}
                  </span>
                </div>

                <div className="flex-1 min-h-[240px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-amber-500" /> Lokacija nepremičnine (Okvirna)
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-6">
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 shadow-sm">
                      📍 Waypoint: {extractKraj(selectedListing.location)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between h-full space-y-5">
                <div>
                  <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1 capitalize w-100">
                    {selectedListing.type || 'Nepremičnina'} • {selectedListing.status || 'Prodaja'}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedListing.location || 'Neznan naslov'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Regija: {getRegion(selectedListing.location)}
                  </p>

                  <div className="grid grid-cols-2 gap-3 my-4 border-y border-slate-100 dark:border-white/5 py-3 text-center">
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-medium">Površina</span>
                      <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                        <FontAwesomeIcon icon={faRulerCombined} className="text-amber-500 mr-1.5 text-xs" />
                        {selectedListing.area && selectedListing.area > 0 ? `${selectedListing.area} m²` : '/'}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-medium">Izvorna stran</span>
                      <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 capitalize">
                        🏠 {selectedListing.site}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 block">Oglaševana tržna cena</span>
                      <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        {formatListingPrice(selectedListing)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 dark:text-slate-500 block">Izračun na m²</span>
                      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {formatPricePerM2(selectedListing)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/20 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      <FontAwesomeIcon icon={faCalculator} /> ETN Detaljna Analiza Con
                    </div>
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Uradni podatki cone
                    </span>
                  </div>

                  {etnData ? (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Zgodovinsko povprečje ETN:</span>
                          <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                            {etnData.etnZoneAverage.toLocaleString('sl-SI')} €/m²
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Tržno odstopanje:</span>
                          <span className="font-bold text-sm sm:text-base text-amber-600 dark:text-amber-400">
                            +{etnData.deviation}% (Precenjeno)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs pt-2.5 border-t border-slate-100 dark:border-white/5">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Referenčna vrednost (ETN):</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {etnData.etnEstimatedTotal.toLocaleString('sl-SI')} €
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Ocenjen GURS davčni temelj:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {etnData.gursTaxBaseEstimate.toLocaleString('sl-SI')} €
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Ni zadostnih podatkov o kvadraturi ali ceni za preračun ETN mikrolokacije.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <a 
                    href={selectedListing.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-center font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-amber-400/10 flex items-center justify-center gap-2"
                  >
                    Odpri izvorni oglas na {selectedListing.site} <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                  </a>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-[#0f172a]"><div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  );
}