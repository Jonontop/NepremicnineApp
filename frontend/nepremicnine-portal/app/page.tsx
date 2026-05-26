'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSearch, faMapMarkerAlt, faTag, faChartLine, faBolt, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

export default function LandingPage() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [action, setAction] = useState('vse');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sestavimo URL parametre glede na vnos v Landing Pageu
    const params = new URLSearchParams();
    if (location.trim()) params.append('location', location);
    if (action !== 'vse') params.append('action', action);

    // Redirektamo uporabnika na iskalnik z nastavljenimi filtri
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col justify-between">
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-200 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <FontAwesomeIcon icon={faHome} />
            <span>SmartNepremičnine</span>
          </div>
          <Link href="/isci" className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg px-4 py-2 transition shadow-sm">
            Odpri Iskalnik
          </Link>
        </div>
      </nav>

      {/* HERO SECTION Z ISKALNIKOM */}
      <header className="bg-gradient-to-b from-white to-gray-50 py-20 px-4 text-center border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Vse slovenske nepremičnine na <span className="text-blue-600">enem mestu</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Pametni agregator, ki v realnem času zbira, čisti in analizira oglase z vseh večjih nepremičninskih portalov v Sloveniji.
          </p>

          {/* POENOSTAČEN SEARCH BAR */}
          <form onSubmit={handleHeroSearch} className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex flex-col md:flex-row gap-3 max-w-3xl mx-auto items-center">
            <div className="w-full md:w-1/3 flex flex-col gap-1 text-left">
              <span className="text-xs font-semibold text-gray-400 uppercase ml-1">Tip posla</span>
              <div className="relative">
                <select 
                  value={action} 
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium appearance-none"
                >
                  <option value="vse">Kupujem / Najemam</option>
                  <option value="prodaja">Kupujem (Prodaja)</option>
                  <option value="oddaja">Najemam (Oddaja)</option>
                </select>
              </div>
            </div>

            <div className="w-full md:flex-1 flex flex-col gap-1 text-left">
              <span className="text-xs font-semibold text-gray-400 uppercase ml-1">Lokacija</span>
              <div className="relative">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="absolute left-4 top-4 text-gray-400" />
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Vpiši mesto, regijo ali poštno številko..." 
                  className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-10 p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-8 py-3.5 transition flex items-center justify-center gap-2 self-end h-[46px] shadow-md shadow-blue-200">
              <FontAwesomeIcon icon={faSearch} /> Najdi dom
            </button>
          </form>
        </div>
      </header>

      {/* PREDNOSTI PROJEKTA (FEATURES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4">
            <FontAwesomeIcon icon={faBolt} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Agregacija v realnem času</h3>
          <p className="text-sm text-gray-600">
            Nič več osveževanja petih različnih portalov. Naši scraperji posodobijo bazo takoj, ko se oglas pojavi na spletu.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Pametno čiščenje podatkov</h3>
          <p className="text-sm text-gray-600">
            Avtomatski sistemi skrbijo za odstranjevanje duplikatov, popravljanje manjkajočih cen in prepoznavanje poteklih oglasov.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4">
            <FontAwesomeIcon icon={faShieldAlt} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Zgodovina in statistika</h3>
          <p className="text-sm text-gray-600">
            Spremljaj gibanje cen nepremičnin skozi čas na specifičnih lokacijah in ugotovi, kdaj je najboljši trenutek za nakup.
          </p>
        </div>
      </section>

      {/* FOOTER Z LINKI DO TOS IN PP */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div>© {new Date().getFullYear()} SmartNepremičnine. Vse pravice pridržane.</div>
          <div className="flex space-x-6">
            <Link href="/tos" className="hover:text-blue-600 transition">Pogoji uporabe (TOS)</Link>
            <Link href="/privacy" className="hover:text-blue-600 transition">Politika zasebnosti (PP)</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}