'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBuilding, faHome, faMapMarkerAlt, faEuroSign, 
  faSortAmountDown, faRulerCombined, faTag, faSearch, 
  faHeart, faChartBar, faPlusCircle, faSlidersH, faEye, faArrowLeft
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
  weight?: number; // Nov stolpec za težo oglasov
}

function SearchContent() {
  const searchParams = useSearchParams();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    action: searchParams.get('action') || 'vse',
    type: 'vse',
    location: searchParams.get('location') || '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('nepremicnine_oglasi')
        .select('*');

      if (error) {
        console.error('Napaka pri pridobivanju oglasov:', error);
      } else {
        setListings((data as Listing[]) || []);
      }
      setLoading(false);
    }
    fetchListings();
  }, []);

  const applyFiltersAndSort = (allListings: Listing[]) => {
    let temp = [...allListings];

    if (filters.action !== 'vse') {
      temp = temp.filter(item => item.status?.toLowerCase().includes(filters.action.toLowerCase()));
    }
    if (filters.location.trim() !== '') {
      temp = temp.filter(item => item.location.toLowerCase().includes(filters.location.toLowerCase()));
    }
    if (filters.minPrice !== '') {
      temp = temp.filter(item => item.price !== null && item.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice !== '') {
      temp = temp.filter(item => item.price !== null && item.price <= Number(filters.maxPrice));
    }

    // PAMETNO SORTIRANJE: Najprej primarna teža (promocije na vrh, zgrešeni na dno), nato izbran filter
    temp.sort((a, b) => {
      const weightA = a.weight ?? 0;
      const weightB = b.weight ?? 0;
      
      if (weightA !== weightB) {
        return weightB - weightA; // Višja teža gre na vrh
      }

      // Če imata isto težo, sortiraj po uporabnikovem izboru
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

    setFilteredListings(temp);
  };

  useEffect(() => {
    if (listings.length > 0) {
      applyFiltersAndSort(listings);
    }
  }, [listings, filters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFiltersAndSort(listings);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-600 dark:text-gray-400">Nalagam najnovejše nepremičnine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* NAVBAR */}
      <nav className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition">
                <FontAwesomeIcon icon={faArrowLeft} />
              </Link>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tracking-tight flex items-center gap-2">
                <FontAwesomeIcon icon={faHome} className="text-2xl" /> 
                <span className="hidden sm:inline">Smart</span>Nepremičnine
              </span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 transition flex items-center gap-1.5">
                <FontAwesomeIcon icon={faSearch} className="text-xs" /> Iskalnik
              </button>
              {/* Ostali gumbi ostanejo enaki, prilagojeni za dark mode */}
              <button className="hidden md:flex px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition items-center gap-1.5">
                <FontAwesomeIcon icon={faPlusCircle} className="text-xs" /> Novogradnje
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* VRSTICA ZA FILTRE */}
      <section className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-4 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3 items-end lg:items-center">
            
            {/* Tip posla */}
            <div className="w-full lg:w-auto flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faTag} className="text-[10px]" /> Tip posla
              </label>
              <select name="action" value={filters.action} onChange={handleFilterChange} className="w-full lg:w-48 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg p-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500">
                <option value="vse">Vse (Prodaja/Oddaja)</option>
                <option value="prodaja">Prodaja</option>
                <option value="oddaja">Oddaja</option>
              </select>
            </div>

            {/* Lokacija */}
            <div className="w-full lg:flex-1 flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px]" /> Lokacija
              </label>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-sm" />
                </div>
                <input type="text" name="location" value={filters.location} onChange={handleFilterChange} placeholder="Npr. Ljubljana, Maribor..." className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg pl-9 p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Cene */}
            <div className="w-full lg:w-auto flex gap-2">
              <div className="flex-1 lg:w-28 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FontAwesomeIcon icon={faEuroSign} className="text-[10px]" /> Min
                </label>
                <input type="number" name="minPrice" value={filters.minPrice} onChange={handleFilterChange} placeholder="Min €" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1 lg:w-28 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FontAwesomeIcon icon={faEuroSign} className="text-[10px]" /> Max
                </label>
                <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleFilterChange} placeholder="Max €" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Sortiranje */}
            <div className="w-full lg:w-auto flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FontAwesomeIcon icon={faSortAmountDown} className="text-[10px]" /> Razvrsti po
              </label>
              <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange} className="w-full lg:w-48 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm rounded-lg p-2.5 font-medium text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="newest">Najnovejši najprej</option>
                <option value="price_asc">Cena: od najnižje</option>
                <option value="price_desc">Cena: od najvišje</option>
                <option value="area_desc">Velikost: največje</option>
              </select>
            </div>

            <div className="w-full lg:w-auto pt-5 lg:pt-0">
              <button type="submit" className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg px-6 py-2.5 transition shadow-sm flex items-center justify-center gap-2🛟">
                <FontAwesomeIcon icon={faSearch} /> Išči
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* MREŽA Z OGLASI Z INTERAKTIVNIMI HOVER EFEKTI */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Prikazanih <span className="font-bold text-gray-800 dark:text-gray-200">{filteredListings.length}</span> oglasov
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div 
              key={listing.id} 
              className="bg-white dark:bg-gray-950 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col shadow-sm transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 group"
            >
              {/* Slikovni del */}
              <div className="h-48 w-full bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
                {listing.image ? (
                  <img 
                    src={listing.image} 
                    alt={listing.location} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-900 flex-col gap-1">
                    <FontAwesomeIcon icon={faBuilding} className="text-2xl text-gray-300 dark:text-gray-700" />
                    <span className="text-xs">Ni slike</span>
                  </div>
                )}
                
                {/* Značka za promocijo (če ima veliko težo) */}
                {(listing.weight && listing.weight > 0) && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-sm">
                    Izpostavljeno
                  </span>
                )}

                <span className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium tracking-wide">
                  {listing.site}
                </span>
              </div>

              {/* Tekstovni del */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate max-w-[65%]" title={listing.location}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400 mr-1 text-sm inline" /> {listing.location}
                    </h2>
                    <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {listing.price ? `${Number(listing.price).toLocaleString('sl-SI')} €` : 'Po dogovoru'}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faRulerCombined} className="text-xs text-gray-400" /> {listing.area ? `${listing.area} m²` : '/'}
                    </span>
                    <span className="capitalize flex items-center gap-1">
                      <FontAwesomeIcon icon={faTag} className="text-xs text-gray-400" /> {listing.status}
                    </span>
                  </div>
                </div>

                <a href={listing.link} target="_blank" rel="noopener noreferrer" className="block text-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm mt-auto shadow-sm flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faEye} /> Oglej si oglas
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}