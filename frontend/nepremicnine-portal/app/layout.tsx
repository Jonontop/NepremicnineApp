import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faEnvelope, faDatabase, faCodeBranch } from '@fortawesome/free-solid-svg-icons';

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
  openGraph: {
    type: 'website',
    locale: 'sl_SI',
    url: '/',
    siteName: 'vesta.si',
    title: 'vesta.si - Nepremičninski oglasi v Sloveniji',
    description:
      'Pametni agregator nepremičninskih oglasov v Sloveniji. Prodaja in oddaja na enem mestu.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'vesta.si - Nepremičninski oglasi v Sloveniji',
    description:
      'Pametni agregator nepremičninskih oglasov v Sloveniji. Prodaja in oddaja na enem mestu.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html lang="sl" className="scroll-smooth" data-scroll-behavior="smooth">
      <body 
        suppressHydrationWarning 
        className={`${manrope.className} bg-slate-50 text-slate-800 min-h-screen flex flex-col justify-between`}
        style={{ fontSize: '115%' }}
      >
        
        {/* Glavna vsebina (Landing ali Iskalnik) */}
        <div className="grow">
          {children}
        </div>

        {/* USKLAJEN IN RAZŠIRJEN PREMIUM FOOTER */}
        <footer className="bg-slate-950 text-white/40 border-t border-white/5 pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Zgornja mreža */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-16 border-b border-white/10">
              
              {/* O projektu / Brand */}
              <div className="col-span-2 md:col-span-1 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-amber-500 text-stone-900 font-bold text-xs">
                    <FontAwesomeIcon icon={faHome} className="w-3 h-3" />
                  </div>
                  <span>vesta.si</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
                  Inteligentni agregator in analitični sistem za spremljanje nepremičninskega trga v Sloveniji. Podatki so zajeti, očiščeni in osveženi 24/7 s pomočjo Python scraperjev.
                </p>
              </div>

              {/* Hitre povezave */}
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Navigacija</h4>
                <div className="flex flex-col gap-2 text-xs">
                  <Link href="/" className="hover:text-amber-400 transition-colors">Domov</Link>
                  <Link href="/search" className="hover:text-amber-400 transition-colors">Iskalnik nepremičnin</Link>
                  <Link href="#stats" className="hover:text-amber-400 transition-colors">Statistika trga</Link>
                </div>
              </div>

              {/* Pravne informacije */}
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Pravno</h4>
                <div className="flex flex-col gap-2 text-xs">
                  <Link href="/tos" className="hover:text-amber-400 transition-colors">Pogoji uporabe (TOS)</Link>
                  <Link href="/privacy" className="hover:text-amber-400 transition-colors">Politika zasebnosti (PP)</Link>
                </div>
              </div>

              {/* Tehnični podatki & Tehnologije */}
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Sistem & Tehnologija</h4>
                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-center gap-2 hover:text-white transition-colors">
                    <FontAwesomeIcon icon={faDatabase} className="text-blue-400 w-3.5 text-center fa-fw" /> 
                    <span>Supabase DB Storage</span>
                  </li>
                  <li className="flex items-center gap-2 hover:text-white transition-colors">
                    <FontAwesomeIcon icon={faCodeBranch} className="text-emerald-400 w-3.5 text-center fa-fw" /> 
                    <span>Python Scrapers + Next.js</span>
                  </li>
                  <li className="flex items-center gap-2 hover:text-white transition-colors">
                    <FontAwesomeIcon icon={faEnvelope} className="text-slate-400 w-3.5 text-center fa-fw" /> 
                    <span>podpora@smartnepremicnine.si</span>
                  </li>
                </ul>
              </div>

            </div>
            
            {/* Spodnji del s podpisom in različico */}
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

      </body>
    </html>
  );
}