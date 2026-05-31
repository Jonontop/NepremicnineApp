import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faEnvelope, 
  faDatabase, 
  faCodeBranch, 
  faSearch, 
  faLayerGroup 
} from '@fortawesome/free-solid-svg-icons'; // <--- Popravljeno na @fortawesome
import { ThemeProvider } from './ThemeProvider';
import NavbarThemeToggle from './components/NavbarThemeToggle';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://smartnepremicnine.si'),
  title: {
    default: 'vesta.si - Nepremičninski oglasi v Sloveniji',
    template: '%s | vesta.si',
  },
  description:
    'Pametni agregator nepremičninskih oglasov v Sloveniji. Primerjajte prodajo in oddajo stanovanj, hiš ter poslovnih prostorov na enem mestu.',
  keywords: [
    'nepremičnine',
    'oglasi nepremičnin',
    'stanovanja Slovenija',
    'hiše Slovenija',
    'oddaja stanovanj',
    'prodaja nepremičnin',
  ],
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sl" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body 
        suppressHydrationWarning 
        className={`${manrope.className} bg-slate-50 text-slate-800 dark:bg-[#0f172a] dark:text-slate-100 min-h-screen flex flex-col justify-between`}
        style={{ fontSize: '115%' }}
      >
        <ThemeProvider>
          
          {/* UNIVERZALNI PREMIUM NAVBAR */}
          <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md bg-white/80 border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              
              {/* Logo / Brand */}
              <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-400 text-slate-950 font-black text-sm shadow-md shadow-amber-400/20">
                  V
                </div>
                <span>vesta<span className="text-amber-500">.si</span></span>
              </Link>

              {/* Navigacijske povezave */}
              <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <Link href="/" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  Domov
                </Link>
                <Link href="/search" className="flex items-center gap-1.5 hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  Iskalnik
                </Link>
                <Link href="/#stats" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  Statistika
                </Link>
              </nav>

              {/* Desni del: Gumb za temo + Iskalni gumb akcija */}
              <div className="flex items-center gap-4">
                {/* Ločena klient komponenta za gumb teme, da celoten layout ostane Server Component */}
                <NavbarThemeToggle />
                
                <Link href="/search" className="hidden sm:inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
                  Hitro Iskanje
                </Link>
              </div>

            </div>
          </header>

          {/* Glavna vsebina (Landing ali Iskalnik) */}
          <div className="grow">
            {children}
          </div>

          {/* USKLAJEN PREMIUM FOOTER */}
          <footer className="bg-slate-950 text-white/40 border-t border-white/5 pt-24 pb-12 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-16 border-b border-white/10">
                
                <div className="col-span-2 md:col-span-1 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center bg-amber-500 text-stone-900 font-bold text-xs">
                      V
                    </div>
                    <span>vesta.si</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
                    Inteligentni agregator in analitični sistem za spremljanje nepremičninskega trga v Sloveniji. Podatki so zajeti, očiščeni in osveženi 24/7.
                  </p>
                </div>

                <div>
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Navigacija</h4>
                  <div className="flex flex-col gap-2 text-xs">
                    <Link href="/" className="hover:text-amber-400 transition-colors">Domov</Link>
                    <Link href="/search" className="hover:text-amber-400 transition-colors">Iskalnik nepremičnin</Link>
                    <Link href="/#stats" className="hover:text-amber-400 transition-colors">Statistika trga</Link>
                  </div>
                </div>

                <div>
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Pravno</h4>
                  <div className="flex flex-col gap-2 text-xs">
                    <Link href="/tos" className="hover:text-amber-400 transition-colors">Pogoji uporabe</Link>
                    <Link href="/privacy" className="hover:text-amber-400 transition-colors">Politika zasebnosti</Link>
                  </div>
                </div>

                <div>
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Sistem</h4>
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
                      <span>podpora@smartnepremicnine.si</span>
                    </li>
                  </ul>
                </div>

              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 text-xs text-slate-500">
                <div className="text-center sm:text-left">
                  &copy; {new Date().getFullYear()} vesta.si Slovenija. Vse pravice pridržane. Podatki so informativne narave.
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] tracking-wider text-slate-400 font-mono">
                    v1.1.0
                  </span>
                </div>
              </div>

            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}