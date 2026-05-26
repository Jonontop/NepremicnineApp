import './globals.css';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faEnvelope, faDatabase, faCodeBranch } from '@fortawesome/free-solid-svg-icons';

export const metadata = {
  title: 'SmartNepremičnine',
  description: 'Pametni agregator nepremičninskih oglasov v Sloveniji',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sl">
      <body suppressHydrationWarning className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 min-h-screen flex flex-col justify-between transition-colors duration-300" >
        
        {/* Glavna vsebina (Landing ali Search) */}
        <div className="flex-grow">
          {children}
        </div>

        {/* RAZŠIRJEN IN PROFESIONALEN FOOTER */}
        <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              
              {/* O projektu */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-bold text-blue-600 dark:text-blue-400">
                  <FontAwesomeIcon icon={faHome} />
                  <span>SmartNepremičnine</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Napreden slovenski agregator, ki s pomočjo Python scraperjev v realnem času zbira, čisti in pametno razvršča nepremičninske oglase.
                </p>
              </div>

              {/* Hitre povezave */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">Navigacija</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Domov</Link></li>
                  <li><Link href="/search" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Iskalnik nepremičnin</Link></li>
                </ul>
              </div>

              {/* Pravne informacije */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">Pravno</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><Link href="/tos" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Pogoji uporabe (TOS)</Link></li>
                  <li><Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Politika zasebnosti (PP)</Link></li>
                </ul>
              </div>

              {/* Tehnični podatki */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">Tehnologija</h3>
                <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faDatabase} className="text-blue-500 w-3" /> Supabase DB Storage
                  </li>
                  <li className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCodeBranch} className="text-green-500 w-3" /> Python Scrapers + Next.js
                  </li>
                  <li className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 w-3" /> podpora@smartnepremicnine.si
                  </li>
                </ul>
              </div>

            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span>© {new Date().getFullYear()} SmartNepremičnine. Vse pravice pridržane. Podatki so informativne narave.</span>
              <span className="text-gray-300 dark:text-gray-700">v1.1.0</span>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}