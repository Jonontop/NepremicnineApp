'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBuilding, faHome, faMapMarkerAlt,
  faSortAmountDown, faRulerCombined, faTag, faSearch, 
  faEye, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';

interface Listing {
  id: string | number;
  location: string;
  price: number | null;
  area: number | null;
  status: string;
  site: string;
  link: string;
  image?: string;
  features?: string[];
  posodobljeno_ob?: string;
  weight?: number;
}

const extractRegion = (location?: string) =>
  (location || '').split(',')[0].trim();

function SearchContent() {
  const searchParams = useSearchParams();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [filters, setFilters] = useState({
    action: searchParams.get('action') || 'vse',
    type: 'vse',
    location: searchParams.get('location') || '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });

  const locationOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        listings
          .map((item) => item.location?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );
    return values.sort((a, b) => a.localeCompare(b, 'sl'));
  }, [listings]);

  const groupedLocations = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const location of locationOptions) {
      const region = extractRegion(location) || 'Ostalo';
      if (!groups.has(region)) groups.set(region, []);
      groups.get(region)!.push(location);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'sl'))
      .map(([region, values]) => ({
        region,
        values: values.sort((a, b) => a.localeCompare(b, 'sl')),
      }));
  }, [locationOptions]);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('nepremicnine_oglasi')
          .select('*');
        if (error) {
          throw error;
        }
        setListings((data as Listing[]) || []);
      } catch (error) {
        console.error('Napaka pri pridobivanju oglasov:', error);
      }
      setLoading(false);
    }
    fetchListings();
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

  const filteredListings = useMemo(() => {
    let temp = [...listings];

    if (filters.action !== 'vse') {
      temp = temp.filter(item => item.status?.toLowerCase().includes(filters.action.toLowerCase()));
    }
    if (filters.location.trim() !== '') {
      temp = temp.filter(item => item.location?.toLowerCase().includes(filters.location.toLowerCase()));
    }
    if (filters.minPrice !== '') {
      temp = temp.filter(item => item.price !== null && item.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice !== '') {
      temp = temp.filter(item => item.price !== null && item.price <= Number(filters.maxPrice));
    }
    
    // Razvrstitev glede na izbran kriterij
    temp.sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return new Date(b.posodobljeno_ob || 0).getTime() - new Date(a.posodobljeno_ob || 0).getTime();
      } else if (filters.sortBy === 'price_asc') {
        return (a.price ?? Infinity) - (b.price ?? Infinity);
      } else if (filters.sortBy === 'price_desc') {
        return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      } else if (filters.sortBy === 'area_desc') {
        return (b.area ?? -Infinity) - (a.area ?? -Infinity);
      }
      return 0;
    });

    return temp;
  }, [listings, filters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-screen ${isDark ? 'bg-[#0f172a]' : 'bg-slate-100'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-2xl font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Nalagam najnovejše nepremičnine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-100 text-slate-900'} selection:bg-amber-300 selection:text-slate-900`}>
      
      {/* NAVBAR */}
      <nav className={`${isDark ? 'bg-[#0f172a]/90 border-slate-800' : 'bg-white/90 border-slate-200'} border-b sticky top-0 z-50 backdrop-blur-md shadow-sm transition-all`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <Link href="/" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors text-lg`}>
                <FontAwesomeIcon icon={faArrowLeft} />
              </Link>
              <span className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 shadow-md">
                  <FontAwesomeIcon icon={faHome} className="text-slate-950 text-base" /> 
                </div>
                <div>
                  <span className={`font-semibold hidden sm:inline ${isDark ? 'text-white' : 'text-slate-900'}`}>vesta.si</span>
                </div>
              </span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                className={`${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-700'} px-3 py-2 rounded-xl text-sm border`}
              >
                {isDark ? 'Dark' : 'Light'}
              </button>
              <button className="px-4 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 shadow-inner flex items-center gap-1.5">
                <FontAwesomeIcon icon={faSearch} className="text-xs" /> Iskalnik
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* VRSTICA ZA FILTRE */}
      <section className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b py-6 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            
            {/* Tip posla */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faTag} className="text-[10px]" /> Tip posla
              </label>
              <select 
                name="action" 
                value={filters.action} 
                onChange={handleFilterChange} 
                className={`w-full border text-sm font-medium rounded-xl p-3 outline-none focus:border-amber-400 appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
              >
                <option value="vse">Vse (Prodaja/Oddaja)</option>
                <option value="prodaja">Prodaja</option>
                <option value="oddaja">Oddaja</option>
              </select>
            </div>

            {/* Lokacija */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px]" /> Lokacija
              </label>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-sm" />
                </div>
                <select 
                  name="location" 
                  value={filters.location} 
                  onChange={handleFilterChange} 
                className={`w-full border text-sm font-medium rounded-xl pl-9 p-3 outline-none focus:border-amber-400 appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
                >
                  <option value="">Vse lokacije</option>
                  {groupedLocations.map((group) => (
                    <optgroup key={group.region} label={group.region}>
                      {group.values.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Cenovni filtri */}
            <div className="flex gap-2">
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Min €
                </label>
                <input 
                  type="number" 
                  name="minPrice" 
                  value={filters.minPrice} 
                  onChange={handleFilterChange} 
                  placeholder="Min" 
                  className={`w-full border placeholder:text-slate-400 text-sm font-medium rounded-xl p-3 outline-none focus:border-amber-400 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'}`} 
                />
              </div>
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Max €
                </label>
                <input 
                  type="number" 
                  name="maxPrice" 
                  value={filters.maxPrice} 
                  onChange={handleFilterChange} 
                  placeholder="Max" 
                  className={`w-full border placeholder:text-slate-400 text-sm font-medium rounded-xl p-3 outline-none focus:border-amber-400 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'}`} 
                />
              </div>
            </div>

            {/* Sortiranje */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faSortAmountDown} className="text-[10px]" /> Razvrstitev
              </label>
              <select 
                name="sortBy" 
                value={filters.sortBy} 
                onChange={handleFilterChange} 
                className={`w-full border text-sm font-bold rounded-xl p-3 outline-none focus:border-amber-400 appearance-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-700'}`}
              >
                <option value="newest">Najnovejši najprej</option>
                <option value="price_asc">Cena: od najnižje</option>
                <option value="price_desc">Cena: od najvišje</option>
                <option value="area_desc">Velikost: največje</option>
              </select>
            </div>

          </form>
        </div>
      </section>

      {/* REZULTATI */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`mb-6 flex justify-between items-center border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} pb-3`}>
          <p className={`text-sm font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Najdeno: <span className="font-bold text-lg text-amber-600 normal-case ml-1">{filteredListings.length}</span> oglasov
          </p>
          <span className={`text-[11px] font-mono tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tabela: public.nepremicnine_oglasi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map((listing) => {
            return (
              <div 
                key={listing.id} 
                className={`${isDark ? 'bg-[#0b1838] border-slate-800/40' : 'bg-white border-slate-300'} rounded-3xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-amber-300/40 group shadow-[0_4px_30px_rgba(0,0,0,0.25)]`}
              >
                {/* Slika */}
                <div className="h-60 w-full bg-slate-950 relative overflow-hidden">
                  {listing.image ? (
                    <img src={listing.image} alt={listing.location} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 bg-slate-950 flex-col gap-1.5">
                      <FontAwesomeIcon icon={faBuilding} className="text-2xl text-white/10" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Ni slike</span>
                    </div>
                  )}
                  
                  <span className={`absolute top-3 right-3 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-lg tracking-wide ${isDark ? 'bg-slate-950/80 text-white/80 border border-white/10' : 'bg-white/90 text-slate-700 border border-slate-200'}`}>
                    {listing.site}
                  </span>
                </div>

                {/* Vsebina */}
                <div className="p-7 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <h2 className={`text-xl font-medium line-clamp-2 leading-snug transition-colors ${isDark ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-amber-700'}`} title={listing.location}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-slate-400 mr-1.5 text-sm inline" /> {listing.location || 'Neznana lokacija'}
                      </h2>
                      <span className={`text-2xl font-semibold whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {listing.price && listing.price > 0 ? `${Number(listing.price).toLocaleString('sl-SI')} €` : 'Po dogovoru'}
                      </span>
                    </div>
                    
                    <div className={`flex gap-6 text-base font-medium border-t pt-4.5 mb-5 ${isDark ? 'text-white/70 border-white/10' : 'text-slate-700 border-slate-200'}`}>
                      <span className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faRulerCombined} className="text-base text-slate-400" /> {listing.area && listing.area > 0 ? `${listing.area} m²` : '/'}
                      </span>
                      <span className="flex items-center gap-2">
                        💶 {listing.price && listing.area && listing.area > 0 ? `${Math.round(Number(listing.price) / Number(listing.area)).toLocaleString('sl-SI')} €/m²` : '/'}
                      </span>
                      <span className="capitalize flex items-center gap-2">
                        <FontAwesomeIcon icon={faTag} className="text-base text-slate-400" /> {listing.status || 'Prodaja'}
                      </span>
                    </div>
                  </div>

                  <a 
                    href={listing.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block text-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all text-sm mt-auto shadow-lg shadow-amber-400/5 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faEye} /> Oglej si oglas
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}